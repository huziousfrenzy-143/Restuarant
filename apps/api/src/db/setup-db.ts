import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/restaurant_saas_db';

console.log('====================================================');
console.log('Restaurant SaaS — PostgreSQL Database Setup & Seed');
console.log('====================================================');
console.log(`Connecting to database: ${connectionString.replace(/:[^:@]+@/, ':****@')}`);

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=require') || connectionString.includes('supabase') || connectionString.includes('neon')
    ? { rejectUnauthorized: false }
    : false
});

async function runSetup() {
  const schemaSqlPath = path.resolve(__dirname, '../../../../infra/schema.sql');
  const seedSqlPath = path.resolve(__dirname, '../../../../infra/seed.sql');

  try {
    const schemaSql = fs.readFileSync(schemaSqlPath, 'utf-8');
    const seedSql = fs.readFileSync(seedSqlPath, 'utf-8');

    console.log('\n[1/2] Executing DDL Table Schema Creation...');
    await pool.query(schemaSql);
    console.log('✓ Public schema tables and tenant_saffron schema tables created successfully.');

    console.log('\n[2/2] Executing Operational Seed Data Insertion...');
    await pool.query(seedSql);
    console.log('✓ Seed data inserted into public and tenant_saffron tables successfully.');

    console.log('\n====================================================');
    console.log('DATABASE SETUP SUCCESSFUL!');
    console.log('====================================================');
  } catch (err: any) {
    console.error('\n❌ Database Setup Error:', err.message);
    console.error('Verify your DATABASE_URL in apps/api/.env or root .env file.');
  } finally {
    await pool.end();
  }
}

runSetup();
