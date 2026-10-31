// Creates (or repairs) the admin account from ADMIN_EMAIL / ADMIN_PASSWORD. Safe to re-run.
// Usage: npm run create-admin
import { env } from '../src/config/env.js';
import { pool } from '../src/config/db.js';
import { ensureUser } from './lib/ensureUser.js';

if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first.');
  process.exit(1);
}

try {
  const { id, created } = await ensureUser({
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
    fullName: 'Administrator',
    role: 'admin',
  });
  console.log(`${created ? 'Created' : 'Updated'} admin ${env.ADMIN_EMAIL} (${id})`);
} catch (err) {
  console.error('create-admin failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
