import { Where, parseSort } from '../../lib/http.js';

const SORT = {
  number: 'number',
  invoiceDate: 'invoice_date',
  dueDate: 'due_date',
  total: 'total',
  amountDue: 'amount_due',
  customerName: 'lower(customer_name)',
  status: 'status',
  createdAt: 'created_at',
};

const MONEY = ['subtotal', 'discount_total', 'tax_total', 'total', 'amount_paid', 'amount_due'];
const moneyAsText = (alias) =>
  `jsonb_build_object(${MONEY.map((m) => `'${m}', ${alias}.${m}::text`).join(', ')})`;

// Invoices with customer name and the overdue flags (confirmed, past due in IST, amount due).
export function overviewSql(todayParam) {
  return `select i.*, c.name as customer_name, s.number as subscription_number,
                 (i.status = 'confirmed' and i.due_date < ${todayParam}::date and i.amount_due > 0) as is_overdue,
                 case when i.status = 'confirmed' and i.due_date < ${todayParam}::date and i.amount_due > 0
                      then ${todayParam}::date - i.due_date else 0 end as days_overdue
            from invoices i
            join customers c on c.id = i.customer_id
            join subscriptions s on s.id = i.subscription_id`;
}

function filters(f, today) {
  const w = new Where();
  const todayP = w.param(today);
  if (f.customerId) w.add('i.customer_id = $?', f.customerId);
  if (f.subscriptionId) w.add('i.subscription_id = $?', f.subscriptionId);
  if (f.from) w.add('i.invoice_date >= $?', f.from);
  if (f.to) w.add('i.invoice_date <= $?', f.to);
  if (f.search) {
    const p = w.param(`%${f.search}%`);
    w.add(`(i.number ilike ${p} or c.name ilike ${p} or s.number ilike ${p})`);
  }
  const narrow = [];
  if (f.status?.length) narrow.push(`status = any(${w.param(f.status)}::invoice_status[])`);
  if (f.overdue !== undefined) narrow.push(f.overdue ? 'is_overdue' : 'not is_overdue');
  return { w, todayP, narrow: narrow.length ? `where ${narrow.join(' and ')}` : '' };
}

// One statement: page rows, total, per-status counts and money totals of the filtered set.
export async function list(db, f, today) {
  const { w, todayP, narrow } = filters(f, today);
  const offset = (f.page - 1) * f.pageSize;
  const { rows } = await db.query(
    `with f as (${overviewSql(todayP)} ${w}),
     ranked as (
       select f.*, row_number() over (order by ${parseSort(f.sort, SORT, 'invoice_date desc, number desc')}, id) as rn
         from f ${narrow}
     )
     select (select count(*) from ranked) as total,
            (select coalesce(json_object_agg(status, n), '{}')
               from (select status, count(*) as n from f group by status) x) as status_counts,
            (select json_build_object(
                      'total', coalesce(sum(total), 0)::text,
                      'amount_paid', coalesce(sum(amount_paid), 0)::text,
                      'amount_due', coalesce(sum(amount_due) filter (where status = 'confirmed'), 0)::text)
               from ranked) as totals,
            (select coalesce(json_agg(
                      (to_jsonb(r) - 'rn' - 'customer_snapshot' - 'company_snapshot') || ${moneyAsText('r')}
                      order by rn), '[]')
               from ranked r where rn > ${offset} and rn <= ${offset + f.pageSize}) as rows`,
    w.params,
  );
  return rows[0];
}

// Every filtered row (for CSV export), ordered like the list.
export async function listAll(db, f, today) {
  const { w, todayP, narrow } = filters(f, today);
  const { rows } = await db.query(
    `with f as (${overviewSql(todayP)} ${w})
     select * from f ${narrow}
      order by ${parseSort(f.sort, SORT, 'invoice_date desc, number desc')}, id
      limit 50000`,
    w.params,
  );
  return rows;
}

export async function findById(db, id, today) {
  const { rows } = await db.query(`${overviewSql('$2')} where i.id = $1`, [id, today]);
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
