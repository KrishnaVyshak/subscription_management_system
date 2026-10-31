import { pool } from './src/config/db.js';
import { summary } from './src/modules/receivables/routes.js';
const c = await pool.connect();
let sql;
const orig = c.query.bind(c);
// capture the receivables SQL
const capture = { query: (t) => { sql = t; return { rows: [{}] }; } };
const db = await import('./src/config/db.js');
const realQuery = db.pool.query.bind(db.pool);
db.pool.query = async (t) => { sql = t; return { rows: [{}] }; };
await summary();
db.pool.query = realQuery;
const t = async (label, pre) => {
  if (pre) await orig(pre);
  const r = await orig('explain (analyze, format json) ' + sql);
  console.log(label, r.rows[0]['QUERY PLAN'][0]['Execution Time'].toFixed(1), 'ms', 'JIT' in r.rows[0]['QUERY PLAN'][0] ? 'JIT!' : '');
};
await t('as is');
await t('as is (warm)');
await t('no parallel', 'set max_parallel_workers_per_gather = 0');
await t('no jit', 'set jit = off');
console.log((await orig('show jit')).rows, (await orig('show jit_above_cost')).rows);
c.release(); await pool.end();
