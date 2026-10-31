import { NotFoundError } from '../../lib/errors.js';
import { Where, parseSort } from '../../lib/http.js';

export async function lockSubscription(client, id) {
  const { rows } = await client.query('select * from subscriptions where id = $1 for update', [id]);
  if (!rows[0]) throw new NotFoundError('Subscription not found');
  return rows[0];
}

export async function findSubscription(db, id) {
  const { rows } = await db.query(
    `select s.*, c.name as customer_name, c.email as customer_email,
            pl.name as plan_name, pt.name as payment_term_name, pt.due_days,
            sp.full_name as salesperson_name
       from subscriptions s
       join customers c on c.id = s.customer_id
       join plans pl on pl.id = s.plan_id
       left join payment_terms pt on pt.id = s.payment_term_id
       left join profiles sp on sp.id = s.salesperson_id
      where s.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function findPlan(db, id) {
  const { rows } = await db.query('select * from plans where id = $1', [id]);
  return rows[0] ?? null;
}

// All lines with their taxes (as json). Callers filter by date with isLineActiveOn.
export async function linesFor(db, subscriptionId) {
  const { rows } = await db.query(
    `select l.*, p.type as product_type, p.name as product_name,
            coalesce(json_agg(json_build_object(
                'id', t.id, 'name', t.name, 'type', t.type, 'rate', t.rate::text,
                'price_included', t.price_included) order by t.name)
              filter (where t.id is not null), '[]') as taxes
       from subscription_lines l
       join products p on p.id = l.product_id
       left join subscription_line_taxes lt on lt.line_id = l.id
       left join taxes t on t.id = lt.tax_id
      where l.subscription_id = $1
      group by l.id, p.type, p.name
      order by l.sort_order, l.created_at`,
    [subscriptionId],
  );
  return rows;
}

export async function insertLine(client, subscriptionId, line, { isPlanLine = false, startsOn = null, sortOrder = 0 } = {}) {
  const { rows } = await client.query(
    `insert into subscription_lines
       (subscription_id, product_id, variant_id, description, quantity, unit_price, is_plan_line, starts_on, sort_order)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning *`,
    [
      subscriptionId,
      line.product_id,
      line.variant_id,
      line.description,
      line.quantity,
      line.unit_price,
      isPlanLine,
      startsOn,
      sortOrder,
    ],
  );
  const inserted = rows[0];
  if (line.tax_ids?.length) {
    await client.query(
      `insert into subscription_line_taxes (line_id, tax_id) select $1, unnest($2::uuid[])`,
      [inserted.id, line.tax_ids],
    );
  }
  return inserted;
}

export async function copyLineTaxes(client, fromLineId, toLineId) {
  await client.query(
    `insert into subscription_line_taxes (line_id, tax_id)
     select $2, tax_id from subscription_line_taxes where line_id = $1`,
    [fromLineId, toLineId],
  );
}

export async function logStatus(client, subscriptionId, from, to, changedBy, note) {
  await client.query(
    `insert into subscription_status_log (subscription_id, from_status, to_status, changed_by, note)
     values ($1, $2, $3, $4, $5)`,
    [subscriptionId, from, to, changedBy ?? null, note ?? null],
  );
}

export async function history(db, subscriptionId) {
  const { rows } = await db.query(
    `select h.id, h.from_status, h.to_status, h.note, h.created_at,
            h.changed_by, p.full_name as changed_by_name
       from subscription_status_log h left join profiles p on p.id = h.changed_by
      where h.subscription_id = $1 order by h.created_at, h.id`,
    [subscriptionId],
  );
  return rows;
}

const SORT = {
  createdAt: 'created_at',
  number: 'number',
  startDate: 'start_date',
  expiryDate: 'expiry_date',
  nextInvoiceDate: 'next_invoice_date',
  customerName: 'lower(customer_name)',
  status: 'status',
};

// One statement: page rows, total and per-status counts (counts ignore the status filter).
export async function list(db, f, today) {
  const w = new Where();
  if (f.customerId) w.add('s.customer_id = $?', f.customerId);
  if (f.planId) w.add('s.plan_id = $?', f.planId);
  if (f.startFrom) w.add('s.start_date >= $?', f.startFrom);
  if (f.startTo) w.add('s.start_date <= $?', f.startTo);
  if (f.search) {
    const p = w.param(`%${f.search}%`);
    w.add(`(s.number ilike ${p} or c.name ilike ${p} or c.email ilike ${p})`);
  }
  const statusFilter = f.status?.length ? `where status = any(${w.param(f.status)}::subscription_status[])` : '';
  const todayP = w.param(today);
  const offset = (f.page - 1) * f.pageSize;
  const order = parseSort(f.sort, SORT, 'created_at desc');

  const { rows } = await db.query(
    `with f as (
       select s.id, s.number, s.status, s.customer_id, c.name as customer_name, s.plan_id,
              pl.name as plan_name, s.billing_period, s.interval_count, s.start_date,
              s.expiry_date, s.next_invoice_date, s.quote_valid_until, s.created_at
         from subscriptions s
         join customers c on c.id = s.customer_id
         join plans pl on pl.id = s.plan_id
         ${w}
     ),
     ranked as (
       select f.*, row_number() over (order by ${order}, id) as rn from f ${statusFilter}
     ),
     page as (
       select r.*,
              (select coalesce(sum(l.quantity * l.unit_price), 0)::numeric(12,2)::text
                 from subscription_lines l
                where l.subscription_id = r.id
                  and (l.starts_on is null or l.starts_on <= ${todayP})
                  and (l.ends_on is null or l.ends_on >= ${todayP})) as recurring_amount
         from ranked r where rn > ${offset} and rn <= ${offset + f.pageSize}
     )
     select (select count(*) from ranked) as total,
            (select coalesce(json_object_agg(status, n), '{}')
               from (select status, count(*) as n from f group by status) x) as status_counts,
            (select coalesce(json_agg(to_jsonb(page) - 'rn' order by rn), '[]') from page) as rows`,
    w.params,
  );
  return rows[0];
}
