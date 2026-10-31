import { SignJWT } from 'jose';
import { createApp } from './src/app.js';
import { env } from './src/config/env.js';
import { pool, query } from './src/config/db.js';
const admin = (await query(`select id from profiles where role='admin' limit 1`)).rows[0];
const token = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(admin.id).setExpirationTime('1h').sign(new TextEncoder().encode(env.SUPABASE_JWT_SECRET));
const server = createApp().listen(0); const port = server.address().port;
for (const p of ['/api/health', '/api/invoices', '/api/invoices?overdue=true', '/api/customers', '/api/receivables/summary', '/api/reports/summary', '/api/reports/revenue-trend?months=12', '/api/reports/by-plan', '/api/reports/top-customers', '/api/payments']) {
  const t = Date.now();
  const ctrl = AbortSignal.timeout(30000);
  try { const r = await fetch(`http://127.0.0.1:${port}${p}`, { headers: { authorization: `Bearer ${token}` }, signal: ctrl }); const b = await r.text(); console.log(r.status, Date.now() - t, 'ms', p, b.slice(0, 80)); }
  catch (e) { console.log('ERR', Date.now() - t, p, e.message); }
}
server.close(); await pool.end();
