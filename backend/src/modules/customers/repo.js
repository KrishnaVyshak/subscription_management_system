import { query } from '../../config/db.js';
import { Where, pageClause, parseSort } from '../../lib/http.js';

const SORT = {
  name: 'lower(c.name)',
  email: 'lower(c.email)',
  createdAt: 'c.created_at',
};

// Search uses the trigram index on name (similarity or substring) and matches email too.
export async function list(f) {
  const w = new Where();
  if (!f.includeInactive) w.add('c.is_active');
  if (f.hasPortal !== undefined) w.add(f.hasPortal ? 'c.profile_id is not null' : 'c.profile_id is null');
  let order = parseSort(f.sort, SORT, 'lower(c.name) asc');
  if (f.search) {
    const p = w.param(f.search);
    w.add(`(c.name operator(extensions.%) ${p} or c.name ilike '%' || ${p} || '%' or c.email ilike '%' || ${p} || '%')`);
    if (!f.sort) order = `extensions.similarity(c.name, ${p}) desc, lower(c.name) asc`;
  }
  const { limit, offset } = pageClause(f);
  const { rows } = await query(
    `select c.*, (c.profile_id is not null) as has_portal,
            (select count(*) from subscriptions s
              where s.customer_id = c.id and s.status = 'active') as active_subscriptions,
            count(*) over() as total
       from customers c ${w}
      order by ${order}
      limit ${limit} offset ${offset}`,
    w.params,
  );
  return { rows: rows.map(({ total, ...r }) => r), total: rows[0]?.total ?? 0 };
}

export async function findById(db, id) {
  const { rows } = await db.query(
    `select c.*, (c.profile_id is not null) as has_portal from customers c where c.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function counts(id, today) {
  const { rows } = await query(
    `select s.active_subscriptions, s.paused_subscriptions, s.total_subscriptions,
            i.outstanding_invoices, i.outstanding_amount, i.overdue_invoices, i.overdue_amount
       from (select count(*) filter (where status = 'active') as active_subscriptions,
                    count(*) filter (where status = 'paused') as paused_subscriptions,
                    count(*) as total_subscriptions
               from subscriptions where customer_id = $1) s,
            (select count(*) filter (where status = 'confirmed' and amount_due > 0) as outstanding_invoices,
                    coalesce(sum(amount_due) filter (where status = 'confirmed'), 0)::text as outstanding_amount,
                    count(*) filter (where status = 'confirmed' and amount_due > 0 and due_date < $2) as overdue_invoices,
                    coalesce(sum(amount_due) filter (where status = 'confirmed' and due_date < $2), 0)::text
                      as overdue_amount
               from invoices where customer_id = $1) i`,
    [id, today],
  );
  return rows[0];
}
