import { Where, parseSort } from '../../lib/http.js';
import { D, fmt } from '../../lib/money.js';

const SORT = {
  number: 'i.number',
  invoiceDate: 'i.invoice_date',
  dueDate: 'i.due_date',
  total: 'i.total',
  amountDue: 'i.amount_due',
  customerName: 'lower(c.name)',
  status: 'i.status',
  createdAt: 'i.created_at',
};

const MONEY = ['subtotal', 'discount_total', 'tax_total', 'total', 'amount_paid', 'amount_due'];
const moneyAsText = (alias) =>
  `jsonb_build_object(${MONEY.map((m) => `'${m}', ${alias}.${m}::text`).join(', ')})`;

// invoice_overview adds customer name, is_overdue and days_overdue (today in IST).
export const OVERVIEW_SQL = `
  select i.*, s.number as subscription_number
    from invoice_overview i
    join subscriptions s on s.id = i.subscription_id
    join customers c on c.id = i.customer_id`;

// Same rule as invoice_overview.is_overdue, on alias i.
const OVERDUE = `(i.status = 'confirmed' and i.due_date < (now() at time zone 'Asia/Kolkata')::date
                  and i.amount_due > 0)`;

const needsCustomer = (f) => Boolean(f.search) || f.sort?.replace(/^-/, '') === 'customerName';

// Base filters (`w`, aliases i and c) plus the status/overdue condition (`cond`), which
// statusCounts ignores.
function filters(f) {
  const w = new Where();
  if (f.customerId) w.add('i.customer_id = $?', f.customerId);
  if (f.subscriptionId) w.add('i.subscription_id = $?', f.subscriptionId);
  if (f.from) w.add('i.invoice_date >= $?', f.from);
  if (f.to) w.add('i.invoice_date <= $?', f.to);
  if (f.search) {
    const p = w.param(`%${f.search}%`);
    w.add(`(i.number ilike ${p} or c.name ilike ${p}
            or exists (select 1 from subscriptions sx where sx.id = i.subscription_id and sx.number ilike ${p}))`);
  }
  const cond = [];
  if (f.status?.length) cond.push(`i.status = any(${w.param(f.status)}::invoice_status[])`);
  if (f.overdue !== undefined) cond.push(f.overdue ? OVERDUE : `not ${OVERDUE}`);
  return { w, cond: cond.length ? cond.join(' and ') : 'true' };
}

const order = (f) => `${parseSort(f.sort, SORT, 'i.invoice_date desc, i.number desc')}, i.id`;

// Status counts and totals come from one grouped pass (by status and overdue), so nothing is
// materialised; full rows are fetched only for the page ids.
export async function list(db, f) {
  const { w, cond } = filters(f);
  const offset = (f.page - 1) * f.pageSize;
  const from = `from invoices i ${needsCustomer(f) ? 'join customers c on c.id = i.customer_id' : ''}`;
  const whereCond = w.parts.length ? `${w} and ${cond}` : `where ${cond}`;
  const { rows } = await db.query(
    `select
       (select coalesce(json_agg(g), '[]')
          from (select i.status, ${OVERDUE} as overdue, count(*) as n,
                       sum(i.total)::text as total, sum(i.amount_paid)::text as amount_paid,
                       sum(i.amount_due)::text as amount_due
                  ${from} ${w} group by 1, 2) g) as groups,
       (select coalesce(json_agg(
                 (to_jsonb(r) - 'customer_snapshot' - 'company_snapshot') || ${moneyAsText('r')}
                 order by p.rn), '[]')
          from unnest(array(select i.id ${from} ${whereCond} order by ${order(f)}
                            limit ${f.pageSize} offset ${offset})) with ordinality as p(id, rn)
          join lateral (${OVERVIEW_SQL} where i.id = p.id) r on true) as rows`,
    w.params,
  );
  return { rows: rows[0].rows, ...summarise(rows[0].groups, f) };
}

// statusCounts over every status; total and money totals over the rows the filters keep.
function summarise(groups, f) {
  const statusCounts = {};
  let total = 0;
  const sums = { total: new D(0), amount_paid: new D(0), amount_due: new D(0) };
  for (const g of groups) {
    statusCounts[g.status] = (statusCounts[g.status] ?? 0) + g.n;
    const keep =
      (!f.status?.length || f.status.includes(g.status)) &&
      (f.overdue === undefined || g.overdue === f.overdue);
    if (!keep) continue;
    total += g.n;
    sums.total = sums.total.plus(g.total);
    sums.amount_paid = sums.amount_paid.plus(g.amount_paid);
    if (g.status === 'confirmed') sums.amount_due = sums.amount_due.plus(g.amount_due);
  }
  return {
    total,
    status_counts: statusCounts,
    totals: { total: fmt(sums.total), amount_paid: fmt(sums.amount_paid), amount_due: fmt(sums.amount_due) },
  };
}

// Every filtered row (for CSV export), ordered like the list.
export async function listAll(db, f) {
  const { w, cond } = filters(f);
  const { rows } = await db.query(
    `${OVERVIEW_SQL} ${w.parts.length ? `${w} and ${cond}` : `where ${cond}`}
      order by ${order(f)} limit 50000`,
    w.params,
  );
  return rows;
}

export async function findById(db, id) {
  const { rows } = await db.query(`${OVERVIEW_SQL} where i.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function linesFor(db, invoiceId) {
  const { rows } = await db.query(
    `select l.*,
            coalesce(json_agg(json_build_object(
                'tax_name', t.tax_name, 'type', t.type, 'rate', t.rate::text,
                'price_included', t.price_included, 'amount', t.amount::text) order by t.tax_name)
              filter (where t.id is not null), '[]') as taxes
       from invoice_lines l left join invoice_line_taxes t on t.invoice_line_id = l.id
      where l.invoice_id = $1
      group by l.id order by l.sort_order`,
    [invoiceId],
  );
  return rows;
}

export async function lock(client, id) {
  const { rows } = await client.query('select * from invoices where id = $1 for update', [id]);
  return rows[0] ?? null;
}
