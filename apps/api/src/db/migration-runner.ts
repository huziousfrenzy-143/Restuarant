import fs from 'fs';
import path from 'path';
import { pgPool } from './pg.client';

const EMBEDDED_PUBLIC_MIGRATIONS: Record<string, string> = {
  '001_init_public.sql': `
    CREATE TABLE IF NOT EXISTS public.organizations (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        schema_name VARCHAR(128) NOT NULL UNIQUE,
        subscription_status VARCHAR(32) NOT NULL CHECK (subscription_status IN ('active', 'expiring_soon', 'expired', 'trial')),
        subscription_expires_at TIMESTAMPTZ NOT NULL,
        plan_type VARCHAR(32) NOT NULL DEFAULT 'pro',
        address TEXT,
        phone VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS public.super_admin_users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.users (
        id VARCHAR(64) PRIMARY KEY,
        org_id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        phone VARCHAR(64),
        role VARCHAR(32) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.platform_audit_log (
        id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        action VARCHAR(128) NOT NULL,
        entity VARCHAR(128) NOT NULL,
        entity_id VARCHAR(64) NOT NULL,
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `
};

const EMBEDDED_TENANT_MIGRATIONS: Record<string, string> = {
  '001_init_tenant.sql': `
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255),
        phone VARCHAR(64),
        role VARCHAR(32) NOT NULL,
        must_reset_password BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS product_categories (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(64) PRIMARY KEY,
        category_id VARCHAR(64) NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
        category_name VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        sku VARCHAR(64) NOT NULL,
        is_available BOOLEAN NOT NULL DEFAULT TRUE,
        image_url TEXT,
        recipe JSONB DEFAULT '[]'::jsonb
    );
    ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT;

    CREATE TABLE IF NOT EXISTS inventory_items (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(32) NOT NULL,
        unit VARCHAR(32) NOT NULL,
        current_qty NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
        reorder_level NUMERIC(10, 3) NOT NULL DEFAULT 0.000,
        unit_cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(32) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_movements (
        id VARCHAR(64) PRIMARY KEY,
        item_id VARCHAR(64) NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
        item_name VARCHAR(255) NOT NULL,
        type VARCHAR(32) NOT NULL,
        qty NUMERIC(10, 3) NOT NULL,
        reference_id VARCHAR(128),
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS clients (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(64) NOT NULL,
        address TEXT,
        notes TEXT,
        credit_balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00
    );

    CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        order_number VARCHAR(64) NOT NULL,
        type VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL,
        table_no VARCHAR(32),
        client_id VARCHAR(64),
        client_name VARCHAR(255),
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        subtotal NUMERIC(10, 2) NOT NULL,
        tax NUMERIC(10, 2) NOT NULL,
        discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        total NUMERIC(10, 2) NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        prep_time_mins INT NOT NULL DEFAULT 15,
        is_overdue BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS order_items (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id VARCHAR(64) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        qty INT NOT NULL,
        unit_price NUMERIC(10, 2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
        id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        order_number VARCHAR(64) NOT NULL,
        payment_method VARCHAR(32) NOT NULL,
        payment_method_name VARCHAR(255),
        amount_paid NUMERIC(10, 2) NOT NULL,
        amount_due NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        cashier_id VARCHAR(64) NOT NULL,
        cashier_name VARCHAR(255) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ledger_accounts (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(32) NOT NULL,
        balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00
    );

    CREATE TABLE IF NOT EXISTS ledger_entries (
        id VARCHAR(64) PRIMARY KEY,
        account_id VARCHAR(64) NOT NULL REFERENCES ledger_accounts(id) ON DELETE CASCADE,
        account_name VARCHAR(255) NOT NULL,
        debit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        credit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
        reference_type VARCHAR(64) NOT NULL,
        reference_id VARCHAR(64) NOT NULL,
        description TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(64) NOT NULL,
        linked_account_id VARCHAR(64) NOT NULL,
        linked_account_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(64) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        assigned_to_id VARCHAR(64) NOT NULL,
        assigned_to_name VARCHAR(255) NOT NULL,
        status VARCHAR(32) NOT NULL,
        due_at TIMESTAMPTZ NOT NULL,
        created_by VARCHAR(255) NOT NULL
    );
  `
};

/**
 * Applies all tenant migrations to a specific target Postgres schema (e.g. tenant_saffron)
 */
export async function applyMigrations(schemaName: string): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS "${schemaName}".schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const tenantMigrationsDir = path.join(__dirname, 'migrations', 'tenant');
    let migrationEntries: { version: string; sql: string }[] = [];

    if (fs.existsSync(tenantMigrationsDir)) {
      const files = fs.readdirSync(tenantMigrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        try {
          const filePath = path.join(tenantMigrationsDir, file);
          const sql = fs.readFileSync(filePath, 'utf-8');
          migrationEntries.push({ version: file, sql });
        } catch (_) {}
      }
    }

    if (migrationEntries.length === 0) {
      migrationEntries = Object.entries(EMBEDDED_TENANT_MIGRATIONS).map(([version, sql]) => ({ version, sql }));
    }

    for (const entry of migrationEntries) {
      const checkRes = await client.query(
        `SELECT version FROM "${schemaName}".schema_migrations WHERE version = $1`,
        [entry.version]
      );

      if (checkRes.rows.length === 0) {
        await client.query('BEGIN');
        await client.query(`SET LOCAL search_path TO "${schemaName}", public`);
        await client.query(entry.sql);
        await client.query(
          `INSERT INTO "${schemaName}".schema_migrations (version) VALUES ($1)`,
          [entry.version]
        );
        await client.query('COMMIT');
        console.log(`[Migration Runner] Successfully applied ${entry.version} to schema "${schemaName}"`);
      }
    }
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[Migration Runner Error] Failed to apply migrations for schema "${schemaName}":`, err.message);
  } finally {
    client.release();
  }
}

/**
 * Applies public platform migrations to the shared 'public' schema
 */
export async function applyPublicMigrations(): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const publicMigrationsDir = path.join(__dirname, 'migrations', 'public');
    let migrationEntries: { version: string; sql: string }[] = [];

    if (fs.existsSync(publicMigrationsDir)) {
      const files = fs.readdirSync(publicMigrationsDir).filter(f => f.endsWith('.sql')).sort();
      for (const file of files) {
        try {
          const filePath = path.join(publicMigrationsDir, file);
          const sql = fs.readFileSync(filePath, 'utf-8');
          migrationEntries.push({ version: file, sql });
        } catch (_) {}
      }
    }

    if (migrationEntries.length === 0) {
      migrationEntries = Object.entries(EMBEDDED_PUBLIC_MIGRATIONS).map(([version, sql]) => ({ version, sql }));
    }

    for (const entry of migrationEntries) {
      const checkRes = await client.query(
        `SELECT version FROM public.schema_migrations WHERE version = $1`,
        [entry.version]
      );

      if (checkRes.rows.length === 0) {
        await client.query('BEGIN');
        await client.query(entry.sql);
        await client.query(
          `INSERT INTO public.schema_migrations (version) VALUES ($1)`,
          [entry.version]
        );
        await client.query('COMMIT');
        console.log(`[Migration Runner] Successfully applied public migration ${entry.version}`);
      }
    }
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[Migration Runner Error] Failed to apply public migrations:`, err.message);
  } finally {
    client.release();
  }
}

/**
 * Loops through all registered tenant organizations in public.organizations and runs applyMigrations
 */
export async function migrateAllTenants(): Promise<void> {
  await applyPublicMigrations();

  const client = await pgPool.connect();
  try {
    const res = await client.query(`SELECT schema_name FROM public.organizations WHERE is_active = true`);
    for (const row of res.rows) {
      if (row.schema_name) {
        await applyMigrations(row.schema_name);
      }
    }
    console.log(`[Migration Runner] Completed tenant migrations for ${res.rows.length} active tenant organizations.`);
  } catch (err: any) {
    console.error(`[Migration Runner Error] Failed migrating tenants:`, err.message);
  } finally {
    client.release();
  }
}
