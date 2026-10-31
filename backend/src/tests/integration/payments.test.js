import request from 'supertest';
import { beforeEach, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { query } from '../../config/db.js';
import { addDays, todayIST } from '../../lib/dates.js';
import { runBilling } from '../../modules/billing/service.js';
import { makeUser } from '../helpers/auth.js';
import { describeDb, useDb } from '../helpers/db.js';
import { makeCustomer, makeSubscription, seedCatalog } from '../helpers/fixtures.js';

const app = createApp();

describeDb('payments and receivables', () => {
  useDb();
  let admin;
  let staff;
  let user;
  let cat;
  let customer;
  let subId;

  beforeEach(async () => {
    admin = await makeUser('admin');
    staff = await makeUser('staff');
    user = { id: staff.id, role: 'staff' };
    cat = await seedCatalog();
    customer = await makeCustomer('Acme Corp');
    subId = await makeSubscription(user, {
      customerId: customer.id,
      planId: cat.plans.crmMonthly.id,
      startDate: '2026-01-01',
    });
  });

  const api = (method, path, who = staff) =>
    request(app)[method](`/api/${path}`).set('Authorization', who.auth);

  async function firstInvoice() {
    await runBilling({ asOfDate: '2026-01-01' });
    const { rows } = await query('select id from invoices where subscription_id = $1', [subId]);
    return rows[0].id;
  }

  it('partial → full → paid; overpayment 422; delete reverts', async () => {
    const id = await firstInvoice();
    const pay = (amount, who = staff) =>
      api('post', `invoices/${id}/payments`, who).send({ method: 'upi', amount, paymentDate: '2026-01-05' });

    const partial = await pay('500');
    expect(partial.status).toBe(201);
    expect(partial.body.data).toMatchObject({ status: 'confirmed', amountPaid: '500.00', amountDue: '680.00' });

    const over = await pay('680.01');
    expect(over.status).toBe(422);
    expect(over.body.error.details).toMatchObject({ rule: 'OVERPAYMENT', amountDue: '680.00' });
    await pay('0').expect(400);

    const full = await pay(680);
    expect(full.body.data).toMatchObject({ status: 'paid', amountDue: '0.00' });
    expect(full.body.data.paidAt).toBeTruthy();
    expect(full.body.data.payments).toHaveLength(2);
    await pay('1').expect(422); // paid invoices take no more payments

    const list = await api('get', `payments?invoiceId=${id}`);
    expect(list.body.meta).toMatchObject({ total: 2, totalAmount: '1180.00' });
    const last = list.body.data.find((p) => p.amount === '680.00');

    await api('delete', `payments/${last.id}`, staff).expect(403);
    await api('delete', `payments/${last.id}`, admin).expect(200);
    const after = await api('get', `invoices/${id}`);
    expect(after.body.data).toMatchObject({ status: 'confirmed', amountPaid: '500.00', paidAt: null });

    // A paid-in-part invoice cannot be cancelled.
    expect((await api('post', `invoices/${id}/cancel`)).body.error.details.rule).toBe('INVOICE_HAS_PAYMENTS');
  });

  it('rejects payments on draft invoices and future dates', async () => {
    await query(`update settings set value = 'false' where key = 'invoice.auto_confirm'`);
    const id = await firstInvoice();
    const res = await api('post', `invoices/${id}/payments`).send({ method: 'cash', amount: 10 });
    expect(res.body.error.details.rule).toBe('INVOICE_NOT_CONFIRMED');
    await api('post', `invoices/${id}/confirm`).expect(200);
    await api('post', `invoices/${id}/payments`)
      .send({ method: 'cash', amount: 10, paymentDate: addDays(todayIST(), 1) })
      .expect(400);
  });

  it('receivables summary buckets and the overdue list', async () => {
    const today = todayIST();
    const make = async (n, dueOffset, total, paid = '0') => {
      await query(
        `insert into invoices (number, subscription_id, customer_id, status, period_start, period_end,
                               invoice_date, due_date, subtotal, total, amount_paid, customer_snapshot)
         values ($1, $2, $3, 'confirmed', $4, $4, $4, $5, $6, $6, $7, '{}')`,
        [`T/${n}`, subId, customer.id, addDays(today, dueOffset - 1 - n), addDays(today, dueOffset), total, paid],
      );
    };
    await make(1, 10, '100.00'); // not due
    await make(2, -5, '200.00'); // 1–30
    await make(3, -45, '300.00', '100.00'); // 31–60, 200 due
    await make(4, -75, '400.00'); // 61–90
    await make(5, -120, '500.00'); // 90+
    await make(6, -3, '600.00', '600.00'); // fully paid (still confirmed status here) → excluded
    await query(
      `insert into payments (invoice_id, customer_id, method, amount, payment_date)
       select id, customer_id, 'cash', 100, $1 from invoices where number = 'T/3'`,
      [today],
    );

    const res = await api('get', 'receivables/summary');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      outstanding: '1400.00',
      outstandingCount: 5,
      overdueCount: 4,
      overdueAmount: '1300.00',
      collectedThisMonth: '100.00',
      ageing: {
        notDue: { count: 1, amount: '100.00' },
        days130: { count: 1, amount: '200.00' },
        days3160: { count: 1, amount: '200.00' },
        days6190: { count: 1, amount: '400.00' },
        days90Plus: { count: 1, amount: '500.00' },
      },
    });

    const overdue = await api('get', 'receivables/overdue');
    expect(overdue.body.data.map((i) => [i.number, i.daysOverdue])).toEqual([
      ['T/5', 120],
      ['T/4', 75],
      ['T/3', 45],
      ['T/2', 5],
    ]);

    const filtered = await api('get', 'invoices?overdue=true&pageSize=2');
    expect(filtered.body.meta.total).toBe(4);
    expect(filtered.body.data[0].isOverdue).toBe(true);
  });
});
