import { query } from '../../config/db.js';
import { Where, pageClause, parseSort } from '../../lib/http.js';

const SORT = {
  name: 'lower(pl.name)',
  price: 'pl.price',
  billingPeriod: 'pl.billing_period',
  createdAt: 'pl.created_at',
};

// Available on `day`: active and inside the optional availability window.
export const AVAILABLE_SQL = (alias, param) =>
  `${alias}.is_active and (${alias}.available_from is null or ${alias}.available_from <= ${param})
   and (${alias}.available_to is null or ${alias}.available_to >= ${param})`;

export async function list(f, today) {
  const w = new Where();
  if (f.available) w.add(AVAILABLE_SQL('pl', w.param(today)));
  else if (!f.includeInactive) w.add('pl.is_active');
  if (f.productId) w.add('pl.product_id = $?', f.productId);
  if (f.billingPeriod) w.add('pl.billing_period = $?', f.billingPeriod);
  if (f.search) w.add('pl.name ilike $?', `%${f.search}%`);
  const { limit, offset } = pageClause(f);
  const sql = `select pl.*, p.name as product_name, count(*) over() as total
                 from plans pl join products p on p.id = pl.product_id ${w}
                order by ${parseSort(f.sort, SORT, 'lower(pl.name) asc')}
                limit ${limit} offset ${offset}`;
  const { rows } = await query(sql, w.params);
  return { rows: rows.map(({ total, ...r }) => r), total: rows[0]?.total ?? 0 };
}

export async function findById(db, id) {
  const { rows } = await db.query(
    `select pl.*, p.name as product_name, p.type as product_type
       from plans pl join products p on p.id = pl.product_id where pl.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}
