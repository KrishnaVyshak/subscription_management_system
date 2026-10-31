import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { asyncHandler as h, listQuerySchema, pageClause, parseSort, sendData, sendList, Where } from '../../lib/http.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const TODAY = `(now() at time zone 'Asia/Kolkata')::date`;

// Outstanding, overdue, collected this month and ageing buckets in one statement.
export async function summary() {
  const bucket = (name, cond) =>
    `'${name}', json_build_object(
        'count', count(*) filter (where ${cond}),
        'amount', coalesce(sum(amount_due) filter (where ${cond}), 0)::text)`;
  const open = `status = 'confirmed' and amount_due > 0`;
  const { rows } = await query(
    `select coalesce(sum(amount_due) filter (where ${open}), 0)::text as outstanding,
            count(*) filter (where ${open}) as outstanding_count,
            count(*) filter (where is_overdue) as overdue_count,
            coalesce(sum(amount_due) filter (where is_overdue), 0)::text as overdue_amount,
            (select coalesce(sum(p.amount), 0)::text from payments p
              where p.payment_date between date_trunc('month', ${TODAY})::date and ${TODAY})
              as collected_this_month,
            json_build_object(
              ${bucket('not_due', `${open} and not is_overdue`)},
              ${bucket('days_1_30', 'is_overdue and days_overdue between 1 and 30')},
              ${bucket('days_31_60', 'is_overdue and days_overdue between 31 and 60')},
              ${bucket('days_61_90', 'is_overdue and days_overdue between 61 and 90')},
              ${bucket('days_90_plus', 'is_overdue and days_overdue > 90')}
            ) as ageing
       from invoice_overview
      where status = 'confirmed'`,
  );
  return rows[0];
}

const overdueSchema = listQuerySchema.extend({ customerId: z.uuid().optional() });
const SORT = { daysOverdue: 'v.days_overdue', amountDue: 'v.amount_due', dueDate: 'v.due_date' };

export async function overdue(f) {
  const w = new Where();
  w.add('v.is_overdue');
  if (f.customerId) w.add('v.customer_id = $?', f.customerId);
  if (f.search) {
    const p = w.param(`%${f.search}%`);
    w.add(`(v.number ilike ${p} or v.customer_name ilike ${p})`);
  }
  const { limit, offset } = pageClause(f);
  const { rows } = await query(
    `select v.id, v.number, v.customer_id, v.customer_name, c.email as customer_email,
            c.phone as customer_phone, v.subscription_id, v.invoice_date, v.due_date,
            v.total::text as total, v.amount_paid::text as amount_paid, v.amount_due::text as amount_due,
            v.days_overdue, v.sent_at, count(*) over() as total_count
       from invoice_overview v join customers c on c.id = v.customer_id
       ${w}
      order by ${parseSort(f.sort, SORT, 'v.days_overdue desc')}, v.number
      limit ${limit} offset ${offset}`,
    w.params,
  );
  return { rows: rows.map(({ total_count: _t, ...r }) => r), total: rows[0]?.total_count ?? 0 };
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
