import jwt from 'jsonwebtoken';
import { pgPool } from '../../db/pg.client';
import { withTenantConnection } from '../../db/tenant-connection';
import { sendOtpEmail } from '../../utils/mailer';
import { verifyPassword, hashPassword } from '../../utils/password';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-saas-jwt-key-2026';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super-secret-saas-refresh-jwt-key-2026';

// In-memory OTP Store (email -> { otp, expiresAt })
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

export class AuthService {
  // Query Super Admin user from public.super_admin_users
  private static async findSuperAdminUser(email: string) {
    const res = await pgPool.query(
      `SELECT id, name, email, password_hash
       FROM public.super_admin_users
       WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );
    return res.rows[0];
  }

  // Find ALL Organizations where a worker email is registered (Scanning tenant databases directly)
  public static async findAllUserOrganizations(email: string): Promise<Array<{ user: any; org: any }>> {
    const cleanEmail = email.toLowerCase().trim();
    const results: Array<{ user: any; org: any }> = [];
    const seenOrgIds = new Set<string>();

    // 1. Iterate through all active tenant schemas in public.organizations first for isolated role accuracy
    try {
      const orgsRes = await pgPool.query(
        `SELECT id, name, slug, schema_name, subscription_status, subscription_expires_at, plan_type, address, phone, is_active
         FROM public.organizations
         WHERE is_active = true`
      );

      for (const org of orgsRes.rows) {
        try {
          const userObj = await withTenantConnection(org.schema_name, async (client) => {
            const uRes = await client.query(
              `SELECT id, name, email, password_hash, phone, role, must_reset_password, is_active, created_at
               FROM users
               WHERE LOWER(email) = $1 AND is_active = true LIMIT 1`,
              [cleanEmail]
            );
            return uRes.rows[0];
          });

          if (userObj) {
            seenOrgIds.add(org.id);
            results.push({
              user: { ...userObj, org_id: org.id },
              org
            });
          }
        } catch (err: any) {
          // Schema might not exist or connection issue
        }
      }
    } catch (e: any) {
      console.warn('[findAllUserOrganizations tenant lookup notice]', e.message);
    }

    // 2. Check public.users table mapping for any remaining orgs
    try {
      const pubRes = await pgPool.query(
        `SELECT u.id, u.org_id, u.name, u.email, u.password_hash, u.phone, u.role, u.is_active, u.created_at,
                o.id as organization_id, o.name as org_name, o.slug as org_slug, o.schema_name, o.subscription_status, o.subscription_expires_at, o.plan_type, o.address as org_address, o.phone as org_phone, o.is_active as org_is_active
         FROM public.users u
         JOIN public.organizations o ON u.org_id = o.id
         WHERE LOWER(u.email) = $1 AND u.is_active = true AND o.is_active = true`,
        [cleanEmail]
      );

      for (const row of pubRes.rows) {
        if (!seenOrgIds.has(row.organization_id)) {
          seenOrgIds.add(row.organization_id);
          results.push({
            user: {
              id: row.id,
              name: row.name,
              email: row.email,
              password_hash: row.password_hash,
              phone: row.phone,
              role: row.role,
              must_reset_password: false,
              is_active: row.is_active,
              created_at: row.created_at,
              org_id: row.organization_id
            },
            org: {
              id: row.organization_id,
              name: row.org_name,
              slug: row.org_slug,
              schema_name: row.schema_name,
              subscription_status: row.subscription_status,
              subscription_expires_at: row.subscription_expires_at,
              plan_type: row.plan_type,
              address: row.org_address,
              phone: row.org_phone,
              is_active: row.org_is_active
            }
          });
        }
      }
    } catch (e: any) {
      console.warn('[findAllUserOrganizations public.users error]', e.message);
    }

    return results;
  }

  // Single staff user lookup helper
  private static async findStaffUser(email: string): Promise<{ user: any; org: any } | null> {
    const allMatches = await this.findAllUserOrganizations(email);
    return allMatches.length > 0 ? allMatches[0] : null;
  }

  // 1. Request OTP for Super Admin ONLY
  static async requestSuperAdminOtp(email: string, password?: string) {
    const superAdminUser = await this.findSuperAdminUser(email);
    if (!superAdminUser) {
      return { success: false, message: 'Access Denied: Email is not authorized for Super Admin access portal.' };
    }

    const storedHash = superAdminUser.password_hash || 'password123';
    if (password && !verifyPassword(password, storedHash)) {
      return { success: false, message: 'Invalid Super Admin password. Please check your credentials.' };
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

    otpStore.set(email.toLowerCase(), { otp: otpCode, expiresAt });
    console.log(`[AuthService] Super Admin Security OTP for ${email}: ${otpCode}`);

    await sendOtpEmail(email, otpCode);

    return {
      success: true,
      message: `Super Admin Security OTP verification code sent to ${email}. Check your inbox!`
    };
  }

  // 2. Verify Super Admin OTP & Issue Token Pair
  static async verifySuperAdminOtp(email: string, otpInput: string) {
    const superAdminUser = await this.findSuperAdminUser(email);
    if (!superAdminUser) {
      return { error: 'Access Denied: Email is not a Super Admin account in database' };
    }

    const record = otpStore.get(email.toLowerCase());
    if (!record) {
      return { error: 'No OTP requested for this email or OTP code expired' };
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return { error: 'OTP code expired. Please request a new code.' };
    }

    if (record.otp !== otpInput.trim()) {
      return { error: 'Invalid 6-digit OTP code' };
    }

    otpStore.delete(email.toLowerCase());

    const userPayload = {
      id: superAdminUser.id,
      name: superAdminUser.name,
      email: superAdminUser.email,
      role: 'super_admin',
      org_id: 'public'
    };

    const payload = {
      id: userPayload.id,
      name: userPayload.name,
      email: userPayload.email,
      org_id: 'public',
      role: 'super_admin'
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: userPayload
    };
  }

  // 3. Request OTP for Tenant Staff Users ONLY
  static async requestOtp(email: string, password?: string) {
    const isSuperAdmin = Boolean(await this.findSuperAdminUser(email));
    if (isSuperAdmin) {
      return { success: false, message: 'Super Admin accounts must log in via the Super Admin portal.' };
    }

    const match = await this.findStaffUser(email);
    if (!match) {
      return { success: false, message: 'No staff account found with this email address' };
    }

    const { user } = match;

    if (password) {
      const storedHash = user.password_hash || 'password123';
      if (!verifyPassword(password, storedHash)) {
        return { success: false, message: 'Invalid password. Please check your credentials.' };
      }
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 mins

    otpStore.set(email.toLowerCase(), { otp: otpCode, expiresAt });
    console.log(`[AuthService] Staff Security OTP for ${email}: ${otpCode}`);

    await sendOtpEmail(email, otpCode);

    return {
      success: true,
      message: `Security OTP verification code sent to ${email}. Check your inbox!`
    };
  }

  // 4. Verify Staff OTP & Issue Token Pair with Multi-Tenant Orgs List
  static async verifyOtp(email: string, otpInput: string, targetOrgId?: string) {
    const isSuperAdmin = Boolean(await this.findSuperAdminUser(email));
    if (isSuperAdmin) {
      return { error: 'Super Admin accounts must use the Super Admin portal.' };
    }

    const record = otpStore.get(email.toLowerCase());
    if (!record) {
      return { error: 'No OTP requested for this email or OTP code expired' };
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(email.toLowerCase());
      return { error: 'OTP code expired. Please request a new code.' };
    }

    if (record.otp !== otpInput.trim()) {
      return { error: 'Invalid 6-digit OTP code' };
    }

    otpStore.delete(email.toLowerCase());

    const allMatches = await this.findAllUserOrganizations(email);
    if (allMatches.length === 0) {
      return { error: 'Staff account not found' };
    }

    const activeMatch = targetOrgId
      ? allMatches.find(m => m.org.id === targetOrgId) || allMatches[0]
      : allMatches[0];

    const { user, org } = activeMatch;
    const userOrgs = allMatches.map(m => m.org);

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      org_id: org.id,
      role: user.role
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        ...user,
        org,
        userOrgs
      },
      userOrgs
    };
  }

  // 5. Direct Staff Login with Multi-Tenant Orgs List
  static async loginStaff(email: string, targetOrgId?: string) {
    const isSuperAdmin = Boolean(await this.findSuperAdminUser(email));
    if (isSuperAdmin) {
      return { error: 'Super Admin accounts must use the Super Admin portal.' };
    }

    const allMatches = await this.findAllUserOrganizations(email);
    if (allMatches.length === 0) {
      return { error: `No staff user account found for email: ${email}` };
    }

    const activeMatch = targetOrgId
      ? allMatches.find(m => m.org.id === targetOrgId) || allMatches[0]
      : allMatches[0];

    const { user, org } = activeMatch;
    const userOrgs = allMatches.map(m => m.org);

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      org_id: org.id,
      role: user.role
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        ...user,
        org,
        userOrgs
      },
      userOrgs
    };
  }

  // 6. Switch Organization Context for Multi-Tenant Workers (Isolated per tenant)
  static async switchOrganization(email: string, targetOrgId: string) {
    const allMatches = await this.findAllUserOrganizations(email);
    const targetMatch = allMatches.find(m => m.org.id === targetOrgId);

    if (!targetMatch) {
      return { error: 'Access Denied: You do not have permissions for the requested organization.' };
    }

    const { user, org } = targetMatch;
    const userOrgs = allMatches.map(m => m.org);

    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      org_id: org.id,
      role: user.role
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

    return {
      accessToken,
      refreshToken,
      user: {
        ...user,
        org,
        userOrgs
      },
      userOrgs
    };
  }

  // 7. Stateless Token Refresh
  static refreshAccessToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      const payload = {
        id: decoded.id,
        name: decoded.name,
        email: decoded.email,
        org_id: decoded.org_id,
        role: decoded.role
      };

      const newAccessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
      const newRefreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch (err) {
      return null;
    }
  }

  static async changePassword(email: string, currentPass: string, newPass: string) {
    const superAdmin = await this.findSuperAdminUser(email);
    if (superAdmin) {
      if (!verifyPassword(currentPass, superAdmin.password_hash)) {
        return { success: false, message: 'Current password is incorrect' };
      }
      const newHash = hashPassword(newPass);
      await pgPool.query(`UPDATE public.super_admin_users SET password_hash = $1 WHERE id = $2`, [newHash, superAdmin.id]);
      return { success: true, message: 'Super Admin password updated successfully!' };
    }

    const match = await this.findStaffUser(email);
    if (!match) {
      return { success: false, message: 'User account not found' };
    }

    const { user, org } = match;
    if (!verifyPassword(currentPass, user.password_hash)) {
      return { success: false, message: 'Current password is incorrect' };
    }

    const newHash = hashPassword(newPass);
    await withTenantConnection(org.schema_name, async (client) => {
      await client.query(`UPDATE users SET password_hash = $1, must_reset_password = false WHERE id = $2`, [newHash, user.id]);
    });

    await pgPool.query(`UPDATE public.users SET password_hash = $1 WHERE email = $2`, [newHash, user.email.toLowerCase().trim()]).catch(() => {});

    return { success: true, message: 'Password updated successfully!' };
  }

  static async getProfile(userId: string, orgId: string, email?: string) {
    const orgRes = await pgPool.query(`SELECT * FROM public.organizations WHERE id = $1 LIMIT 1`, [orgId]);
    const org = orgRes.rows[0];

    if (!org) return { user: null, org: null, userOrgs: [] };

    let userObj: any = null;
    try {
      userObj = await withTenantConnection(org.schema_name, async (client) => {
        // Try by userId first, then fallback by email for tenant switching safety
        const uRes = await client.query(
          `SELECT id, name, email, phone, role, must_reset_password, is_active FROM users WHERE id = $1 OR LOWER(email) = LOWER($2) LIMIT 1`,
          [userId, email || '']
        );
        return uRes.rows[0];
      });
    } catch (e) {
      // Fallback
    }

    const cleanEmail = email || userObj?.email;
    const userOrgsMatches = cleanEmail ? await this.findAllUserOrganizations(cleanEmail) : [];
    const userOrgs = userOrgsMatches.map(m => m.org);

    return {
      user: userObj ? { ...userObj, org, userOrgs } : null,
      org,
      userOrgs
    };
  }
}
