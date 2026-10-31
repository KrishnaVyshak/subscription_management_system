// Load-tests the list, report and detail endpoints and fails if any p95 latency exceeds 2 s.
// Runs the API in-process against DATABASE_URL (use it after npm run seed:large) and signs an
// admin JWT with SUPABASE_JWT_SECRET. Usage: npm run perf-check [-- --duration 10 --connections 10]
import autocannon from 'autocannon';
import { SignJWT } from 'jose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { pool, query } from '../src/config/db.js';

const LIMIT_MS = 2000;
const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? Number(process.argv[i + 1]) : fallback;
};
const duration = arg('duration', 5);
const connections = arg('connections', 10);

if (!env.SUPABASE_JWT_SECRET) {
  console.error('perf-check signs its own admin token and needs SUPABASE_JWT_SECRET.');
  process.exit(1);
}

const admin = (await query(`select id from profiles where role = 'admin' and is_active limit 1`)).rows[0];
if (!admin) {
  console.error('No active admin profile: run npm run create-admin first.');
  process.exit(1);
}
const sample = (
  await query(`
    select (select id from subscriptions where status = 'active' order by created_at limit 1) as sub,
           (select id from invoices order by created_at desc limit 1) as invoice,
           (select id from customers order by created_at limit 1) as customer,
           (select count(*) from invoices) as invoices,
           (select count(*) from subscriptions) as subscriptions`)
).rows[0];

const token = await new SignJWT({ role: 'authenticated' })
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject(admin.id)
  .setIssuedAt()
  .setExpirationTime('1h')
  .sign(new TextEncoder().encode(env.SUPABASE_JWT_SECRET));

const ENDPOINTS = [
  '/api/subscriptions',
  '/api/subscriptions?status=active&sort=-nextInvoiceDate',
  '/api/subscriptions?search=tech',
  `/api/subscriptions/${sample.sub}`,
  '/api/invoices',
  '/api/invoices?overdue=true',
  '/api/invoices?status=paid&sort=-total',
  `/api/invoices/${sample.invoice}`,
  '/api/customers',
  '/api/customers?search=group',
  `/api/customers/${sample.customer}`,
  '/api/payments',
  '/api/receivables/summary',
  '/api/receivables/overdue',
  '/api/reports/summary',
  '/api/reports/summary?from=2025-11-01&to=2026-10-31',
  '/api/reports/revenue-trend?months=12',
  '/api/reports/by-plan',
  '/api/reports/top-customers',
  '/api/plans?available=true',
  '/api/products',
  '/api/discounts',
  '/api/billing/runs',
];

const server = createApp().listen(0);
const port = server.address().port;
console.log(
  `perf-check: ${sample.subscriptions} subscriptions, ${sample.invoices} invoices; ` +
    `${connections} connections × ${duration}s per endpoint, limit p95 < ${LIMIT_MS} ms\n`,
);

// Waits until no query is running or queued, so one endpoint's backlog does not count
// against the next.
async function drain() {
  for (let i = 0; i < 300 && (pool.totalCount !== pool.idleCount || pool.waitingCount); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

const results = [];
for (const path of ENDPOINTS) {
  await drain();
  const r = await autocannon({
    url: `http://127.0.0.1:${port}${path}`,
    connections,
    duration,
    headers: { authorization: `Bearer ${token}` },
  });
  // autocannon reports p90 and p97.5; p97.5 is an upper bound for p95. An endpoint that
  // completed no requests in the window counts as failed.
  const p95 = r.requests.total ? (r.latency.p95 ?? r.latency.p97_5) : Infinity;
  const errors = r.non2xx + r.errors + r.timeouts + (r.requests.total ? 0 : 1);
  results.push({ path, p50: r.latency.p50, p95, max: r.latency.max, rps: Math.round(r.requests.average), errors });
  console.log(
    `${p95 < LIMIT_MS && !errors ? 'ok  ' : 'FAIL'} p50 ${String(r.latency.p50).padStart(5)} ms  ` +
      `p95≤ ${String(p95).padStart(5)} ms  ${String(Math.round(r.requests.average)).padStart(4)} req/s  ` +
      `${errors ? `${errors} errors  ` : ''}${path}`,
  );
}

// Let requests still running when the last window ended finish before closing the pool.
await new Promise((resolve) => server.close(resolve));
await drain();
await pool.end();

const failed = results.filter((r) => r.p95 >= LIMIT_MS || r.errors);
const worst = results.reduce((a, b) => (b.p95 > a.p95 ? b : a));
console.log(`\nWorst p95: ${worst.p95} ms (${worst.path}).`);
if (failed.length) {
  console.error(`${failed.length} endpoint(s) over ${LIMIT_MS} ms or erroring.`);
  process.exit(1);
}
console.log('All endpoints under the limit.');
