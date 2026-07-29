import dotenv from 'dotenv';
import { initPgDatabase } from './pg.client';

dotenv.config();

export async function runSeed() {
  console.log('[Seed Script] Initializing Root Super Admin Database...');
  await initPgDatabase();
  console.log('[Seed Script] Root Admin initialized successfully (No mock tenant data created).');
}

if (require.main === module) {
  runSeed().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
