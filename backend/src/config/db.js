import pg from 'pg';
import { env } from './env.js';

// DATE columns stay 'YYYY-MM-DD' strings (no timezone shifts); counts come back as numbers.
// NUMERIC stays a string so money never touches a float.
pg.types.setTypeParser(1082, (v) => v);
pg.types.setTypeParser(20, (v) => Number.parseInt(v, 10));

const isLocalDb = /@(localhost|127\.0\.0\.1)[:/]/.test(env.DATABASE_URL);

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('Unexpected idle Postgres client error', err);
});

export function query(text, params) {
  return pool.query(text, params);
}

// Runs fn(client) inside BEGIN/COMMIT; rolls back on any throw. Use for every multi-table write.
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
