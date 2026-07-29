import { Router, Response } from 'express';
import { CreateUserInputSchema } from '@restaurant-saas/shared-schemas';
import { requireRole } from '../../middlewares/auth.middleware';
import { hashPassword } from '../../utils/password';
import { TenantRequest } from '../../middlewares/tenant.middleware';
import { TenantDbHelper } from '../../db/tenant-connection';
import { pgPool } from '../../db/pg.client';

export class UserService {
  static async getUsers(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => {
      const res = await client.query(
        `SELECT id, name, email, phone, role, must_reset_password, is_active, created_at
         FROM users
         ORDER BY created_at DESC`
      );
      return res.rows;
    });
  }

  static async createUser(tenantDb: TenantDbHelper, input: any, orgId?: string) {
    const rawPassword = input.password || 'password123';
    const passwordHash = hashPassword(rawPassword);
    const newId = `usr-${Date.now()}`;
    const cleanEmail = (input.email || '').toLowerCase().trim();
    const targetOrgId = orgId || 'org-1';

    return await tenantDb(async (client) => {
      const res = await client.query(
        `INSERT INTO users (id, name, email, password_hash, phone, role, must_reset_password, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, false, true, NOW())
         RETURNING id, name, email, phone, role, must_reset_password, is_active, created_at`,
        [newId, input.name, cleanEmail, passwordHash, input.phone, input.role]
      );

      // Keep public.users in sync
      await pgPool.query(
        `INSERT INTO public.users (id, org_id, name, email, password_hash, phone, role, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW())
         ON CONFLICT (email) DO UPDATE SET org_id = EXCLUDED.org_id, name = EXCLUDED.name, role = EXCLUDED.role`,
        [newId, targetOrgId, input.name, cleanEmail, passwordHash, input.phone, input.role]
      ).catch(() => {});

      return res.rows[0];
    });
  }

  static async updateUser(tenantDb: TenantDbHelper, id: string, input: any) {
    return await tenantDb(async (client) => {
      const res = await client.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             email = COALESCE($2, email),
             phone = COALESCE($3, phone),
             role = COALESCE($4, role),
             is_active = COALESCE($5, is_active)
         WHERE id = $6
         RETURNING id, name, email, phone, role, must_reset_password, is_active, created_at`,
        [input.name, input.email ? input.email.toLowerCase().trim() : undefined, input.phone, input.role, input.is_active, id]
      );
      if (res.rows[0]) {
        const u = res.rows[0];
        await pgPool.query(
          `UPDATE public.users SET name = $1, email = $2, phone = $3, role = $4, is_active = $5 WHERE id = $6`,
          [u.name, u.email, u.phone, u.role, u.is_active, id]
        ).catch(() => {});
      }
      return res.rows[0] || null;
    });
  }

  static async deleteUser(tenantDb: TenantDbHelper, id: string) {
    return await tenantDb(async (client) => {
      const res = await client.query(`DELETE FROM users WHERE id = $1 RETURNING id`, [id]);
      await pgPool.query(`DELETE FROM public.users WHERE id = $1`, [id]).catch(() => {});
      return res.rowCount ? res.rowCount > 0 : false;
    });
  }
}

export class UserController {
  static async getUsers(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const data = await UserService.getUsers(req.tenantDb);
    res.json({ data });
  }

  static async createUser(req: TenantRequest, res: Response) {
    const parse = CreateUserInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parse.error.format() } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const user = await UserService.createUser(req.tenantDb, parse.data, req.params.orgId);
    res.status(201).json({ data: user, message: `Staff account created for ${user.name} (${user.role})` });
  }

  static async updateUser(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const updated = await UserService.updateUser(req.tenantDb, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Staff user not found' } });
    }
    res.json({ data: updated, message: `Staff account '${updated.name}' updated successfully` });
  }

  static async deleteUser(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const success = await UserService.deleteUser(req.tenantDb, req.params.id);
    if (!success) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Staff user not found' } });
    }
    res.json({ message: 'Staff account deleted successfully' });
  }
}

const router = Router({ mergeParams: true });

// Enforce role-based access control: Only owner, admin, or super_admin can manage staff users
router.use(requireRole('super_admin', 'owner', 'admin'));

router.get('/', UserController.getUsers);
router.post('/', UserController.createUser);
router.put('/:id', UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

export default router;
