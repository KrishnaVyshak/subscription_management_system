import { query, withTransaction } from '../../config/db.js';
import { todayIST } from '../../lib/dates.js';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { Where, pageClause, parseSort } from '../../lib/http.js';
import { D, fmt } from '../../lib/money.js';

const SORT = {
  paymentDate: 'p.payment_date',
  amount: 'p.amount',
  createdAt: 'p.created_at',
  customerName: 'lower(c.name)',
};

export async function paymentsForInvoice(client, invoiceId) {
  const { rows } = await client.query(
    `select p.*, pr.full_name as recorded_by_name
       from payments p left join profiles pr on pr.id = p.recorded_by
      where p.invoice_id = $1 order by p.payment_date, p.created_at`,
    [invoiceId],
  );
  return rows;
}

// Locks the invoice, adds the payment, and marks the invoice paid once nothing is due.
export async function record(invoiceId, { method, amount, paymentDate, note }, user, today = todayIST()) {
  const date = paymentDate ?? today;
  if (date > today) throw new ValidationError('The payment date cannot be in the future');
  return withTransaction(async (client) => {
    const { rows } = await client.query('select * from invoices where id = $1 for update', [invoiceId]);
    const invoice = rows[0];
    if (!invoice || (user.customerId && invoice.customer_id !== user.customerId)) {
      throw new NotFoundError('Invoice not found');
    }
    if (invoice.status !== 'confirmed') {
      throw new BusinessRuleError(`Payments can only be recorded on confirmed invoices (this one is ${invoice.status})`, {
        rule: 'INVOICE_NOT_CONFIRMED',
      });
    }
    const due = new D(invoice.amount_due);
    if (new D(amount).gt(due)) {
      throw new BusinessRuleError(`The amount is more than the ${fmt(due)} due`, {
        rule: 'OVERPAYMENT',
        amountDue: fmt(due),
      });
    }
    const { rows: inserted } = await client.query(
      `insert into payments (invoice_id, customer_id, method, amount, payment_date, note, recorded_by)
       values ($1, $2, $3, $4, $5, $6, $7) returning *`,
      [invoiceId, invoice.customer_id, method, amount, date, note ?? null, user.id],
    );
    const paidInFull = new D(amount).eq(due);
    await client.query(
      `update invoices
          set amount_paid = amount_paid + $2,
              status = case when $3 then 'paid'::invoice_status else status end,
              paid_at = case when $3 then now() else paid_at end
        where id = $1`,
      [invoiceId, amount, paidInFull],
    );
    return inserted[0];
  });
}

// Admin only. A paid invoice goes back to confirmed.
export async function remove(paymentId) {
  return withTransaction(async (client) => {
    const { rows } = await client.query('select * from payments where id = $1', [paymentId]);
    const payment = rows[0];
    if (!payment) throw new NotFoundError('Payment not found');
    await client.query('select id from invoices where id = $1 for update', [payment.invoice_id]);
    await client.query('delete from payments where id = $1', [paymentId]);
    await client.query(
      `update invoices
          set amount_paid = amount_paid - $2,
              status = case when status = 'paid' then 'confirmed'::invoice_status else status end,
              paid_at = case when status = 'paid' then null else paid_at end
        where id = $1`,
      [payment.invoice_id, payment.amount],
    );
    return payment;
  });
}

// `customerId` scopes the list for the portal.
export async function list(f, { customerId } = {}) {
  const w = new Where();
  if (customerId) w.add('p.customer_id = $?', customerId);
  if (f.customerId) w.add('p.customer_id = $?', f.customerId);
  if (f.invoiceId) w.add('p.invoice_id = $?', f.invoiceId);
  if (f.method) w.add('p.method = $?', f.method);
  if (f.from) w.add('p.payment_date >= $?', f.from);
  if (f.to) w.add('p.payment_date <= $?', f.to);
  if (f.search) {
    const p = w.param(`%${f.search}%`);
    w.add(`(i.number ilike ${p} or c.name ilike ${p})`);
  }
  const { limit, offset } = pageClause(f);
  const { rows } = await query(
    `select p.*, i.number as invoice_number, c.name as customer_name,
            pr.full_name as recorded_by_name,
            count(*) over() as total, (sum(p.amount) over())::text as total_amount
       from payments p
       join invoices i on i.id = p.invoice_id
       join customers c on c.id = p.customer_id
       left join profiles pr on pr.id = p.recorded_by
       ${w}
      order by ${parseSort(f.sort, SORT, 'p.payment_date desc, p.created_at desc')}
      limit ${limit} offset ${offset}`,
    w.params,
  );
  return {
    rows: rows.map(({ total, total_amount: _t, ...r }) => r),
    total: rows[0]?.total ?? 0,
    totalAmount: rows[0]?.total_amount ?? '0.00',
  };
}
