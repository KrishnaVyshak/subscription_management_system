import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import {
  asyncHandler as h,
  listQuerySchema,
  pageClause,
  parseSort,
  sendData,
  sendList,
  Where,
} from '../../lib/http.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const TODAY = `(now() at time zone 'Asia/Kolkata')::date`;

// Outstanding, overdue, collected this month and ageing buckets in one statement. Open
// invoices are bucketed once per row (same overdue rule as invoice_overview); the FILTER
// clauses then work on the five bucket rows instead of every invoice.
export async function summary() {
  const bucket = (name) =>
    `'${name}', json_build_object(
        'count', coalesce(sum(n) filter (where bucket = '${name}'), 0)::int,
        'amount', coalesce(sum(amount) filter (where bucket = '${name}'), 0)::text)`;
  const { rows } = await query(
    `with b as (
       select case when i.due_date >= t.today then 'not_due'
                   when t.today - i.due_date <= 30 then 'days_1_30'
                   when t.today - i.due_date <= 60 then 'days_31_60'
                   when t.today - i.due_date <= 90 then 'days_61_90'
                   else 'days_90_plus' end as bucket,
              count(*) as n, sum(i.amount_due) as amount
         from invoices i, (select ${TODAY} as today) t
        where i.status = 'confirmed' and i.amount_due > 0
        group by 1
     )
     select coalesce(sum(amount), 0)::text as outstanding,
            coalesce(sum(n), 0)::int as outstanding_count,
            coalesce(sum(n) filter (where bucket <> 'not_due'), 0)::int as overdue_count,
            coalesce(sum(amount) filter (where bucket <> 'not_due'), 0)::text as overdue_amount,
            (select coalesce(sum(p.amount), 0)::text from payments p
              where p.payment_date between date_trunc('month', ${TODAY})::date and ${TODAY})
              as collected_this_month,
            json_build_object(
              ${bucket('not_due')}, ${bucket('days_1_30')}, ${bucket('days_31_60')},
              ${bucket('days_61_90')}, ${bucket('days_90_plus')}
            ) as ageing
       from b`,
  );
  return rows[0];
}

const overdueSchema = listQuerySchema.extend({ customerId: z.uuid().optional() });
// Columns of the narrow overdue set `o`.
const SORT = { daysOverdue: 'days_overdue', amountDue: 'amount_due', dueDate: 'due_date' };

// Overdue invoices (same rule as invoice_overview): counted from the open-invoice index, with
// customer details fetched for the page only.
export async function overdue(f) {
  const w = new Where();
  w.add(`i.status = 'confirmed' and i.amount_due > 0 and i.due_date < ${TODAY}`);
  if (f.customerId) w.add('i.customer_id = $?', f.customerId);
  if (f.search) {
    const p = w.param(`%${f.search}%`);
    w.add(`(i.number ilike ${p} or exists (select 1 from customers cx where cx.id = i.customer_id and cx.name ilike ${p}))`);
  }
  const { limit, offset } = pageClause(f);
  const { rows } = await query(
    `with o as (
       select i.id, i.number, i.due_date, i.amount_due, ${TODAY} - i.due_date as days_overdue
         from invoices i ${w}
     )
     select (select count(*) from o) as total,
            (select coalesce(json_agg(r order by x.rn), '[]')
               from unnest(array(select id from o order by ${parseSort(f.sort, SORT, 'days_overdue desc')}, number
                                 limit ${limit} offset ${offset})) with ordinality as x(id, rn)
               join lateral (
                 select i.id, i.number, i.customer_id, c.name as customer_name, c.email as customer_email,
                        c.phone as customer_phone, i.subscription_id, i.invoice_date, i.due_date,
                        i.total::text as total, i.amount_paid::text as amount_paid,
                        i.amount_due::text as amount_due, ${TODAY} - i.due_date as days_overdue, i.sent_at
                   from invoices i join customers c on c.id = i.customer_id
                  where i.id = x.id) r on true) as rows`,
    w.params,
  );
  return { rows: rows[0].rows, total: rows[0].total };
}

const router = Router();

router.use(requireRole('admin', 'staff'));
router.get('/summary', h(async (_req, res) => sendData(res, await summary())));
router.get(
  '/overdue',
  validate({ query: overdueSchema }),
  h(async (req, res) => {
    const { rows, total } = await overdue(req.query);
    sendList(res, rows, { page: req.query.page, pageSize: req.query.pageSize, total });
  }),
);

export default router;
