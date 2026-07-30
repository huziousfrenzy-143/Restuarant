import { Pool } from 'pg';
import dotenv from 'dotenv';
import { hashPassword } from '../utils/password';
import { applyPublicMigrations, applyMigrations } from './migration-runner';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/restaurant_saas_db';

export const pgPool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=require') || connectionString.includes('supabase') || connectionString.includes('neon')
    ? { rejectUnauthorized: false }
    : false
});

let isPgConnected = false;

export async function repairMissingTenantUsers() {
  try {
    const orgsRes = await pgPool.query(`SELECT id, name, slug, schema_name FROM public.organizations`);
    const defaultPasswordHash = hashPassword('password123');

    for (const org of orgsRes.rows) {
      if (!org.schema_name) continue;

      // Ensure tenant schema and tables exist
      await applyMigrations(org.schema_name).catch(() => {});

      try {
        const uRes = await pgPool.query(`SELECT count(*)::int as cnt FROM "${org.schema_name}".users`);
        if (uRes.rows[0].cnt === 0) {
          const ownerEmail = `arhamsaif66@gmail.com`;
          const ownerId = `usr-owner-${org.id}`;

          await pgPool.query(`
            INSERT INTO "${org.schema_name}".users (id, name, email, password_hash, role, must_reset_password, is_active)
            VALUES ('${ownerId}', '${org.name} Owner', '${ownerEmail}', '${defaultPasswordHash}', 'owner', true, true)
            ON CONFLICT (email) DO NOTHING;
          `);

          await pgPool.query(`
            INSERT INTO public.users (id, org_id, name, email, password_hash, phone, role, is_active)
            VALUES ('${ownerId}', '${org.id}', '${org.name} Owner', '${ownerEmail}', '${defaultPasswordHash}', null, 'owner', true)
            ON CONFLICT (email) DO NOTHING;
          `).catch(() => {});

          console.log(`[Self-Healing] Repaired missing owner user '${ownerEmail}' for organization '${org.name}' in schema '${org.schema_name}'.`);
        }
      } catch (e: any) {
        console.warn(`[Self-Healing Warning] Could not check users in schema '${org.schema_name}':`, e.message);
      }
    }
  } catch (err: any) {
    console.warn('[Self-Healing Error]', err.message);
  }
}

export async function initPgDatabase() {
  try {
    const client = await pgPool.connect();
    console.log(`[PostgreSQL DB] Connected successfully using DATABASE_URL: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);
    isPgConnected = true;
    client.release();

    // 1. Run public platform table migrations
    await applyPublicMigrations().catch(e => console.warn('[Migration Warning]', e.message));

    // Ensure public.users table has password_hash column
    await pgPool.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`).catch(() => {});

    // 2. Ensure Super Admin account is seeded into public.super_admin_users
    const superAdminHash = hashPassword('password123');
    await pgPool.query(
      `INSERT INTO public.super_admin_users (id, name, email, password_hash)
       VALUES ('usr-super-admin', 'Super Admin Operator', 'arhamsaifofficial@gmail.com', $1)
       ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash`,
      [superAdminHash]
    ).catch(e => console.warn('[Super Admin Seed Warning]', e.message));

    // 3. Repair any tenant organizations missing owner users
    await repairMissingTenantUsers().catch(e => console.warn('[Repair Users Warning]', e.message));

    console.log(`[PostgreSQL DB] Public platform database schema & super_admin_users verified.`);
  } catch (err: any) {
    console.warn(`[PostgreSQL DB Warning] PostgreSQL setup failed: ${err.message}.`);
    isPgConnected = false;
  }
}

export function getIsPgConnected() {
  return isPgConnected;
}
