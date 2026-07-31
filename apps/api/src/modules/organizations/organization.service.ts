import { OrganizationRepository } from './organization.repository';
import { CreateOrganizationInput } from '@restaurant-saas/shared-schemas';
import { sendOwnerOnboardingEmail } from '../../utils/mailer';
import { pgPool } from '../../db/pg.client';
import { withTenantConnection } from '../../db/tenant-connection';
import { hashPassword } from '../../utils/password';

export class OrganizationService {
  static async getAllOrganizations() {
    return await OrganizationRepository.findAll();
  }

  static async getOrganizationById(id: string) {
    return await OrganizationRepository.findById(id);
  }

  static async createOrganization(input: CreateOrganizationInput) {
    // 1. Provision Organization record in public.organizations & Postgres dedicated tenant schema
    const result = await OrganizationRepository.create(input);
    const { organization, tempOwnerPassword, ownerEmail } = result;

    const schemaName = organization.schema_name;
    const ownerPassword = tempOwnerPassword || 'password123';
    const passwordHash = hashPassword(ownerPassword);
    const ownerUserId = `usr-owner-${organization.id}`;
    const cleanEmail = (input.owner_email || '').toLowerCase().trim();

    // 2. Ensure initial owner user is saved into public.users table for platform-wide auth
    if (cleanEmail) {
      await pgPool.query(
        `INSERT INTO public.users (id, org_id, name, email, password_hash, phone, role, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'owner', true, NOW())
         ON CONFLICT (email) DO UPDATE SET 
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           role = 'owner',
           is_active = true`,
        [ownerUserId, organization.id, input.owner_name || 'Organization Owner', cleanEmail, passwordHash, input.phone || null]
      ).catch(e => console.warn('[Public User Seed Warning]', e.message));
    }

    // 3. Populate initial tenant operational data & create owner user inside tenant's dedicated schema
    await withTenantConnection(schemaName, async (client) => {
      // Create Owner User in tenant schema
      if (cleanEmail) {
        await client.query(
          `INSERT INTO users (id, name, email, password_hash, role, must_reset_password, is_active, created_at)
           VALUES ($1, $2, $3, $4, 'owner', true, true, NOW())
           ON CONFLICT (email) DO UPDATE SET 
             name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = 'owner',
             is_active = true`,
          [ownerUserId, input.owner_name || 'Organization Owner', cleanEmail, passwordHash]
        );
      }

      // Starter categories
      const cat1Id = `cat-${organization.id}-1`;
      const cat2Id = `cat-${organization.id}-2`;
      const cat3Id = `cat-${organization.id}-3`;

      await client.query(
        `INSERT INTO product_categories (id, name, sort_order) VALUES
         ($1, 'Starters & Appetizers', 1),
         ($2, 'Main Courses & Specials', 2),
         ($3, 'Beverages & Mocktails', 3)
         ON CONFLICT (id) DO NOTHING`,
        [cat1Id, cat2Id, cat3Id]
      );

      // Starter inventory item
      const inv1Id = `inv-${organization.id}-1`;
      await client.query(
        `INSERT INTO inventory_items (id, name, unit, current_qty, reorder_level, unit_cost, status) VALUES
         ($1, 'Fresh Seasoning & Supplies', 'kg', 25.0, 5.0, 4.20, 'in_stock')
         ON CONFLICT (id) DO NOTHING`,
        [inv1Id]
      );

      // Starter product
      const prod1Id = `prod-${organization.id}-1`;
      const recipeJson = JSON.stringify([{ inventory_item_id: inv1Id, inventory_item_name: 'Fresh Seasoning & Supplies', qty_required: 0.25, unit: 'kg' }]);
      await client.query(
        `INSERT INTO products (id, category_id, category_name, name, price, cost_price, sku, is_available, recipe) VALUES
         ($1, $2, 'Main Courses & Specials', $3, 16.50, 4.80, 'MAIN-01', true, $4::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [prod1Id, cat2Id, `${input.name} Signature Dish`, recipeJson]
      );

      // $0.00 Ledger accounts
      const leg1Id = `leg-${organization.id}-1`;
      const leg2Id = `leg-${organization.id}-2`;
      const leg3Id = `leg-${organization.id}-3`;
      const leg4Id = `leg-${organization.id}-4`;
      const leg5Id = `leg-${organization.id}-5`;
      const leg6Id = `leg-${organization.id}-6`;

      await client.query(
        `INSERT INTO ledger_accounts (id, name, type, balance) VALUES
         ($1, 'Cash Register Float', 'cash', 0.00),
         ($2, 'Merchant Bank Account', 'bank', 0.00),
         ($3, 'Customer Accounts Receivable', 'receivable', 0.00),
         ($4, 'Supplier Accounts Payable', 'payable', 0.00),
         ($5, 'Food & Beverage Revenue', 'revenue', 0.00),
         ($6, 'Cost of Ingredients & Supplies', 'expense', 0.00)
         ON CONFLICT (id) DO NOTHING`,
        [leg1Id, leg2Id, leg3Id, leg4Id, leg5Id, leg6Id]
      );

      // Payment methods linked to starter ledger accounts
      const pmList = [
        { id: `pm-${organization.id}-1`, name: 'Cash Register', code: 'cash', account_id: leg1Id, account_name: 'Cash Register Float' },
        { id: `pm-${organization.id}-2`, name: 'Card Terminal (Visa/Mastercard)', code: 'card', account_id: leg2Id, account_name: 'Merchant Bank Account' },
        { id: `pm-${organization.id}-3`, name: 'UPI / QR Mobile Pay', code: 'upi', account_id: leg2Id, account_name: 'Merchant Bank Account' },
        { id: `pm-${organization.id}-4`, name: 'Customer Store Credit', code: 'credit', account_id: leg3Id, account_name: 'Customer Accounts Receivable' }
      ];

      for (const pm of pmList) {
        await client.query(
          `INSERT INTO payment_methods (id, name, code, linked_account_id, linked_account_name, is_active)
           VALUES ($1, $2, $3, $4, $5, true)
           ON CONFLICT (id) DO NOTHING`,
          [pm.id, pm.name, pm.code, pm.account_id, pm.account_name]
        );
      }
    });

    // 4. Log Audit Trail in public.platform_audit_log
    await pgPool.query(
      `INSERT INTO public.platform_audit_log (id, user_id, user_name, action, entity, entity_id, details)
       VALUES ($1, 'usr-super-admin', 'Super Admin', 'ORGANIZATION_PROVISIONED', 'organization', $2, $3::jsonb)`,
      [`aud-${Date.now()}`, organization.id, JSON.stringify({ name: organization.name, schema: organization.schema_name, plan: organization.plan_type, owner_email: cleanEmail })]
    ).catch(() => {});

    // 5. Send Onboarding Email with Login Link & Generated Password
    const loginUrl = process.env.ORG_ADMIN_URL || 'https://restuarants-org-admin.vercel.app';
    if (ownerEmail && tempOwnerPassword) {
      await sendOwnerOnboardingEmail(
        ownerEmail,
        input.owner_name,
        input.name,
        loginUrl,
        tempOwnerPassword
      ).catch(err => console.error('[Mailer Error]', err));
    }

    return { org: organization, tempOwnerPassword };
  }

  static async deleteOrganization(id: string) {
    const success = await OrganizationRepository.delete(id);
    if (success) {
      await pgPool.query(
        `INSERT INTO public.platform_audit_log (id, user_id, user_name, action, entity, entity_id, details)
         VALUES ($1, 'usr-super-admin', 'Super Admin', 'ORGANIZATION_DELETED', 'organization', $2, $3::jsonb)`,
        [`aud-${Date.now()}`, id, JSON.stringify({ deleted_at: new Date().toISOString() })]
      ).catch(() => {});
    }
    return success;
  }

  static async updateOrganization(id: string, updates: any) {
    const updated = await OrganizationRepository.update(id, updates);
    if (updated) {
      await pgPool.query(
        `INSERT INTO public.platform_audit_log (id, user_id, user_name, action, entity, entity_id, details)
         VALUES ($1, 'usr-super-admin', 'Super Admin', 'ORGANIZATION_UPDATED', 'organization', $2, $3::jsonb)`,
        [`aud-${Date.now()}`, id, JSON.stringify(updates)]
      ).catch(() => {});
    }
    return updated;
  }

  static async toggleOrganizationStatus(id: string, isActive: boolean) {
    const updated = await OrganizationRepository.toggleStatus(id, isActive);
    if (updated) {
      await pgPool.query(
        `INSERT INTO public.platform_audit_log (id, user_id, user_name, action, entity, entity_id, details)
         VALUES ($1, 'usr-super-admin', 'Super Admin', $2, 'organization', $3, $4::jsonb)`,
        [`aud-${Date.now()}`, isActive ? 'ORGANIZATION_ACTIVATED' : 'ORGANIZATION_SUSPENDED', id, JSON.stringify({ is_active: isActive })]
      ).catch(() => {});
    }
    return updated;
  }

  static async extendSubscription(orgId: string, extensionType: string, customExpiresAt?: string) {
    const org = await OrganizationRepository.findById(orgId);
    if (!org) return null;

    let newExpiry = new Date(org.subscription_expires_at);
    if (newExpiry.getTime() < Date.now()) {
      newExpiry = new Date();
    }

    if (extensionType === 'one_month') {
      newExpiry.setMonth(newExpiry.getMonth() + 1);
    } else if (extensionType === 'three_months') {
      newExpiry.setMonth(newExpiry.getMonth() + 3);
    } else if (extensionType === 'custom_date' && customExpiresAt) {
      newExpiry = new Date(customExpiresAt);
    }

    const diffDays = Math.ceil((newExpiry.getTime() - Date.now()) / (1000 * 3600 * 24));
    const status = diffDays <= 5 ? 'expiring_soon' : 'active';

    const updated = await OrganizationRepository.updateSubscription(org.id, newExpiry.toISOString(), status);

    await pgPool.query(
      `INSERT INTO public.platform_audit_log (id, user_id, user_name, action, entity, entity_id, details)
       VALUES ($1, 'usr-super-admin', 'Super Admin', 'SUBSCRIPTION_EXTENDED', 'organization', $2, $3::jsonb)`,
      [`aud-${Date.now()}`, org.id, JSON.stringify({ extensionType, new_expiry: newExpiry.toISOString() })]
    ).catch(() => {});

    return updated;
  }
}
