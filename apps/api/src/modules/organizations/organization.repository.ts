import crypto from 'crypto';
import { pgPool } from '../../db/pg.client';
import { Organization, CreateOrganizationInput } from '@restaurant-saas/shared-schemas';
import { applyMigrations } from '../../db/migration-runner';
import { hashPassword } from '../../utils/password';

export class OrganizationRepository {
  private static async ensureTaxRateColumnExists() {
    try {
      await pgPool.query(`ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 10;`);
    } catch (e: any) {
      console.warn('[ensureTaxRateColumnExists notice]', e.message);
    }
  }

  static async findAll(): Promise<Organization[]> {
    await this.ensureTaxRateColumnExists();
    const res = await pgPool.query(
      `SELECT id, name, slug, schema_name, subscription_status, subscription_expires_at, plan_type, COALESCE(tax_rate, 10) as tax_rate, address, phone, created_at, is_active
       FROM public.organizations
       ORDER BY created_at DESC`
    );
    return res.rows;
  }

  static async findById(id: string): Promise<Organization | undefined> {
    await this.ensureTaxRateColumnExists();
    const res = await pgPool.query(
      `SELECT id, name, slug, schema_name, subscription_status, subscription_expires_at, plan_type, COALESCE(tax_rate, 10) as tax_rate, address, phone, created_at, is_active
       FROM public.organizations
       WHERE id = $1 OR slug = $1`,
      [id]
    );
    return res.rows[0];
  }

  static async create(input: CreateOrganizationInput): Promise<{ organization: Organization; tempOwnerPassword?: string; ownerEmail?: string }> {
    await this.ensureTaxRateColumnExists();
    const client = await pgPool.connect();
    try {
      await client.query('BEGIN');

      const orgId = `org-${Date.now()}`;
      const schemaName = `tenant_${input.slug.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
      const expiresAt = new Date(Date.now() + (input.subscription_days || 30) * 86400000).toISOString();
      const createdAt = new Date().toISOString();
      const taxRate = input.tax_rate || 10;

      // 1. Insert into public.organizations
      const orgRes = await client.query(
        `INSERT INTO public.organizations
          (id, name, slug, schema_name, subscription_status, subscription_expires_at, plan_type, tax_rate, address, phone, created_at, is_active)
         VALUES ($1, $2, $3, $4, 'active', $5, $6, $7, $8, $9, $10, true)
         RETURNING id, name, slug, schema_name, subscription_status, subscription_expires_at, plan_type, tax_rate, address, phone, created_at, is_active`,
        [orgId, input.name, input.slug, schemaName, expiresAt, input.plan_type || 'pro', taxRate, input.address, input.phone, createdAt]
      );
      const organization: Organization = orgRes.rows[0];

      // 2. Create Postgres Tenant Dedicated Schema
      await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

      await client.query('COMMIT');
      client.release();

      // 3. Apply Tenant Migrations to build out tables inside tenant schema
      await applyMigrations(schemaName);

      // 4. Provision Initial Owner user inside tenant schema's users table & public.users table
      const tenantClient = await pgPool.connect();
      const tempPassword = 'password123';
      if (input.owner_email) {
        const cleanEmail = input.owner_email.toLowerCase().trim();
        const passwordHash = hashPassword(tempPassword);
        const ownerId = `usr-owner-${organization.id}`;

        // Insert into tenant schema's users table
        await tenantClient.query('BEGIN');
        await tenantClient.query(`SET LOCAL search_path TO "${schemaName}", public`);
        await tenantClient.query(
          `INSERT INTO users (id, name, email, password_hash, role, must_reset_password, is_active, created_at)
           VALUES ($1, $2, $3, $4, 'owner', true, true, NOW())
           ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
          [ownerId, input.owner_name || 'Organization Owner', cleanEmail, passwordHash]
        );
        await tenantClient.query('COMMIT');

        // Insert into public.users table as well for platform-wide fast auth lookup
        await pgPool.query(
          `INSERT INTO public.users (id, org_id, name, email, password_hash, phone, role, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'owner', true, NOW())
           ON CONFLICT (email) DO UPDATE SET 
             name = EXCLUDED.name,
             password_hash = EXCLUDED.password_hash,
             role = 'owner',
             is_active = true`,
          [ownerId, organization.id, input.owner_name || 'Organization Owner', cleanEmail, passwordHash, input.phone || null]
        ).catch(e => console.warn('[Public User Seed Warning]', e.message));
      }
      tenantClient.release();

      return {
        organization,
        tempOwnerPassword: tempPassword,
        ownerEmail: input.owner_email
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      throw err;
    }
  }

  static async update(id: string, updates: Partial<Organization>): Promise<Organization | undefined> {
    await this.ensureTaxRateColumnExists();
    const res = await pgPool.query(
      `UPDATE public.organizations
       SET name = COALESCE($1, name),
           plan_type = COALESCE($2, plan_type),
           tax_rate = COALESCE($3, tax_rate),
           address = COALESCE($4, address),
           phone = COALESCE($5, phone)
       WHERE id = $6
       RETURNING id, name, slug, schema_name, subscription_status, subscription_expires_at, plan_type, tax_rate, address, phone, created_at, is_active`,
      [updates.name, updates.plan_type, updates.tax_rate, updates.address, updates.phone, id]
    );
    return res.rows[0];
  }

  static async updateSubscription(id: string, newExpiry: string, status: 'active' | 'expiring_soon' | 'expired'): Promise<Organization | undefined> {
    await this.ensureTaxRateColumnExists();
    const res = await pgPool.query(
      `UPDATE public.organizations
       SET subscription_expires_at = $1,
           subscription_status = $2
       WHERE id = $3
       RETURNING id, name, slug, schema_name, subscription_status, subscription_expires_at, plan_type, tax_rate, address, phone, created_at, is_active`,
      [newExpiry, status, id]
    );
    return res.rows[0];
  }

  static async toggleStatus(id: string, isActive: boolean): Promise<Organization | undefined> {
    await this.ensureTaxRateColumnExists();
    const res = await pgPool.query(
      `UPDATE public.organizations
       SET is_active = $1
       WHERE id = $2
       RETURNING id, name, slug, schema_name, subscription_status, subscription_expires_at, plan_type, tax_rate, address, phone, created_at, is_active`,
      [isActive, id]
    );
    return res.rows[0];
  }

  static async delete(id: string): Promise<boolean> {
    const org = await this.findById(id);
    if (!org) return false;

    if (org.schema_name) {
      await pgPool.query(`DROP SCHEMA IF EXISTS "${org.schema_name}" CASCADE;`).catch(e => console.warn('[Drop Schema Notice]', e.message));
    }

    await pgPool.query(`DELETE FROM public.users WHERE org_id = $1;`, [id]).catch(() => {});
    const res = await pgPool.query(`DELETE FROM public.organizations WHERE id = $1;`, [id]);
    return (res.rowCount || 0) > 0;
  }
}
