import fs from 'fs';
import path from 'path';
import { pgPool } from './pg.client';

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
    let files: string[] = [];

    if (fs.existsSync(tenantMigrationsDir)) {
      files = fs.readdirSync(tenantMigrationsDir).filter(f => f.endsWith('.sql')).sort();
    }

    for (const file of files) {
      const migrationVersion = file;
      const checkRes = await client.query(
        `SELECT version FROM "${schemaName}".schema_migrations WHERE version = $1`,
        [migrationVersion]
      );

      if (checkRes.rows.length === 0) {
        const filePath = path.join(tenantMigrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        await client.query('BEGIN');
        await client.query(`SET LOCAL search_path TO "${schemaName}", public`);
        await client.query(sql);
        await client.query(
          `INSERT INTO "${schemaName}".schema_migrations (version) VALUES ($1)`,
          [migrationVersion]
        );
        await client.query('COMMIT');
        console.log(`[Migration Runner] Successfully applied ${file} to schema "${schemaName}"`);
      }
    }
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[Migration Runner Error] Failed to apply migrations for schema "${schemaName}":`, err.message);
    throw err;
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
    let files: string[] = [];

    if (fs.existsSync(publicMigrationsDir)) {
      files = fs.readdirSync(publicMigrationsDir).filter(f => f.endsWith('.sql')).sort();
    }

    for (const file of files) {
      const migrationVersion = file;
      const checkRes = await client.query(
        `SELECT version FROM public.schema_migrations WHERE version = $1`,
        [migrationVersion]
      );

      if (checkRes.rows.length === 0) {
        const filePath = path.join(publicMigrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `INSERT INTO public.schema_migrations (version) VALUES ($1)`,
          [migrationVersion]
        );
        await client.query('COMMIT');
        console.log(`[Migration Runner] Successfully applied public migration ${file}`);
      }
    }
  } catch (err: any) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`[Migration Runner Error] Failed to apply public migrations:`, err.message);
    throw err;
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
