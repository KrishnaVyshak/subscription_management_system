import { pool, query } from './src/config/db.js';
import { summary } from './src/modules/receivables/routes.js';
const show = async (label, sql, params = []) => {
  const { rows } = await query(`explain (analyze, buffers, format text) ${sql}`, params);
  const lines = rows.map((r) => r['QUERY PLAN']);
  console.log(`\n=== ${label}: ${lines.at(-1)}`);
  console.log(lines.filter((l) => /Seq Scan|Index|Hash Join|Sort|actual time=\d{3,}/.test(l)).slice(0, 14).join('\n'));
};
// capture SQL of the app queries by monkeypatching pool.query
const captured = [];
const orig = pool.query.bind(pool);
pool.query = (text, params) => { captured.push({ text, params }); return orig(text, params); };
const inv = await import('./src/modules/invoices/service.js');
const pay = await import('./src/modules/payments/service.js');
const rep = await import('./src/modules/reports/service.js');
const base = { page: 1, pageSize: 25 };
for (const [label, fn] of [
  ['invoices list', () => inv.list({ ...base })],
  ['payments list', () => pay.list({ ...base })],
  ['receivables summary', () => summary()],
  ['reports summary', () => rep.summary({})],
  ['overdue list', async () => (await import('./src/modules/receivables/routes.js')).overdue({ ...base })],
]) {
  captured.length = 0;
  const t = Date.now(); await fn(); const ms = Date.now() - t;
  const q = captured.at(-1);
  pool.query = orig;
  console.log(`\n##### ${label}: ${ms} ms wall`);
  await show(label, q.text, q.params);
  pool.query = (text, params) => { captured.push({ text, params }); return orig(text, params); };
}
await pool.end();
