import { AuthService } from './modules/auth/auth.service';
import { pgPool } from './db/pg.client';
import { hashPassword } from './utils/password';

async function testAuth() {
  const newHash = hashPassword('password123');

  // Reset password to password123 for arhamsaif66@gmail.com in tenant schemas & public.users
  const orgs = await pgPool.query('SELECT schema_name FROM public.organizations');
  for (const o of orgs.rows) {
    if (!o.schema_name) continue;
    try {
      await pgPool.query(`UPDATE "${o.schema_name}".users SET password_hash = '${newHash}' WHERE LOWER(email) = 'arhamsaif66@gmail.com'`);
    } catch (e) {}
  }
  await pgPool.query(`UPDATE public.users SET password_hash = '${newHash}' WHERE LOWER(email) = 'arhamsaif66@gmail.com'`).catch(() => {});

  console.log('Testing staff lookup for arhamsaif66@gmail.com with password password123...');
  const res = await AuthService.requestOtp('arhamsaif66@gmail.com', 'password123');
  console.log('RESULT:', res);
}

testAuth().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
