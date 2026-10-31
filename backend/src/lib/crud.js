import { camelToSnake } from './case.js';

// Small helpers for single-table writes. Keys come from zod-parsed bodies (camelCase),
// so every key is a known column; values are always parameterised.
const columns = (data) => Object.keys(data).filter((k) => data[k] !== undefined);

export async function insertRow(db, table, data) {
  const keys = columns(data);
  const cols = keys.map((k) => `"${camelToSnake(k)}"`).join(', ');
  const vals = keys.map((_, i) => `$${i + 1}`).join(', ');
  const { rows } = await db.query(
    `insert into ${table} (${cols}) values (${vals}) returning *`,
    keys.map((k) => data[k]),
  );
  return rows[0];
}

// Returns the updated row, or null when the id does not exist.
export async function updateRow(db, table, id, data) {
  const keys = columns(data);
  if (keys.length === 0) {
    const { rows } = await db.query(`select * from ${table} where id = $1`, [id]);
    return rows[0] ?? null;
  }
  const sets = keys.map((k, i) => `"${camelToSnake(k)}" = $${i + 2}`).join(', ');
  const { rows } = await db.query(`update ${table} set ${sets} where id = $1 returning *`, [
    id,
    ...keys.map((k) => data[k]),
  ]);
  return rows[0] ?? null;
}

export async function findRow(db, table, id) {
  const { rows } = await db.query(`select * from ${table} where id = $1`, [id]);
  return rows[0] ?? null;
}
