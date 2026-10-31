import request from 'supertest';
import { beforeEach, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { query } from '../../config/db.js';
import { billSubscription, runBilling } from '../../modules/billing/service.js';
import { makeUser } from '../helpers/auth.js';
import { describeDb, useDb } from '../helpers/db.js';
import { makeCustomer, makeSubscription, seedCatalog } from '../helpers/fixtures.js';

const app = createApp();

describeDb('billing engine', () => {
  useDb();
  let admin;
  let staff;
  let user;
  let cat;
  let customer;

  beforeEach(async () => {
    admin = await makeUser('admin');
    staff = await makeUser('staff');
    user = { id: staff.id, role: 'staff' };
    cat = await seedCatalog();
    customer = await makeCustomer('Acme Corp');
  });

  const invoicesOf = async (subId) =>
    (
      await query(
        `select number, status, period_start, period_end, invoice_date, due_date, subtotal, tax_total, total
           from invoices where subscription_id = $1 order by period_start`,
        [subId],
      )
    ).rows;
  const subRow = async (id) => (await query('select * from subscriptions where id = $1', [id])).rows[0];

  it('catch-up bills every missed period with month-end dates from the anchor', async () => {
    const id = await makeSubscription(user, {
      customerId: customer.id,
      planId: cat.plans.crmMonthly.id,
      startDate: '2026-01-31',
    });
    const run = await runBilling({ asOfDate: '2026-04-30' });
    expect(run).toMatchObject({ status: 'completed', due: 1, generated: 4, skipped: 0, failed: 0 });

    const invoices = await invoicesOf(id);
    expect(invoices.map((i) => [i.period_start, i.period_end])).toEqual([
      ['2026-01-31', '2026-02-27'],
      ['2026-02-28', '2026-03-30'],
      ['2026-03-31', '2026-04-29'],
      ['2026-04-30', '2026-05-30'],
    ]);
    // Bill in advance: invoice date = period start; no payment term → due the same day.
    expect(invoices[0]).toMatchObject({
      status: 'confirmed',
      invoice_date: '2026-01-31',
      due_date: '2026-01-31',
      subtotal: '1000.00',
      tax_total: '180.00',
      total: '1180.00',
    });
    expect(invoices[0].number).toMatch(/^INV\/2026\/\d{5}$/);
    expect(await subRow(id)).toMatchObject({ periods_billed: 4, next_invoice_date: '2026-05-31' });
  });

  it('a second run generates nothing', async () => {
    await makeSubscription(user, { customerId: customer.id, planId: cat.plans.crmMonthly.id, startDate: '2026-01-01' });
    expect((await runBilling({ asOfDate: '2026-03-01' })).generated).toBe(3);
    const second = await runBilling({ asOfDate: '2026-03-01' });
    expect(second).toMatchObject({ due: 0, generated: 0 });
  });

  it('parallel runs and parallel billers never create duplicates', async () => {
    const ids = [];
    for (let i = 0; i < 6; i += 1) {
      ids.push(
        await makeSubscription(user, {
          customerId: customer.id,
          planId: cat.plans.hrWeekly.id,
          startDate: '2026-01-05',
          lines: [{ productId: cat.products.hr, quantity: 5 }],
        }),
      );
    }
    const results = await Promise.allSettled([
      runBilling({ asOfDate: '2026-02-01' }),
      runBilling({ asOfDate: '2026-02-01' }),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const r of rejected) expect(r.reason.status).toBe(409);

    // Hammer one subscription with concurrent billers past the run date.
    await Promise.all(Array.from({ length: 5 }, () => billSubscription(ids[0], '2026-03-01')));

    const { rows } = await query(
      `select subscription_id, period_start, count(*) as n from invoices
        group by 1, 2 having count(*) > 1`,
    );
    expect(rows).toEqual([]);
    // 5 weekly periods from 5 Jan to 2 Feb (≤ 1 Feb: 5, 12, 19, 26 Jan) = 4 each.
    const counts = await query(`select subscription_id, count(*) as n from invoices group by 1`);
    const byId = Object.fromEntries(counts.rows.map((r) => [r.subscription_id, r.n]));
    for (const id of ids.slice(1)) expect(byId[id]).toBe(4);
    // ids[0] was billed through 1 Mar: 5 Jan … 23 Feb = 8 weeks.
    expect(byId[ids[0]]).toBe(8);
  });

  it('never bills paused, closed, draft or confirmed subscriptions, nor past expiry', async () => {
    const make = (status, extra = {}) =>
      makeSubscription(user, {
        customerId: customer.id,
        planId: cat.plans.crmMonthly.id,
        startDate: '2026-01-31',
        status,
        ...extra,
      });
    const paused = await make('paused');
    const closed = await make('closed');
    const draft = await make('draft');
    const confirmed = await make('confirmed');
    const expiring = await make('active', { expiryDate: '2026-03-15' });

    await runBilling({ asOfDate: '2026-06-30' });
    for (const id of [paused, closed, draft, confirmed]) expect(await invoicesOf(id)).toEqual([]);
    expect((await invoicesOf(expiring)).map((i) => i.period_start)).toEqual(['2026-01-31', '2026-02-28']);
    expect(await subRow(expiring)).toMatchObject({ next_invoice_date: '2026-03-31' });
  });

  it('applies payment terms and the auto-confirm setting', async () => {
    await query(`update settings set value = 'false' where key = 'invoice.auto_confirm'`);
    const id = await makeSubscription(user, {
      customerId: customer.id,
      planId: cat.plans.crmMonthly.id,
      startDate: '2026-02-01',
    });
    await query('update subscriptions set payment_term_id = $2 where id = $1', [id, cat.terms.net15]);
    await runBilling({ asOfDate: '2026-02-01' });
    const [inv] = await invoicesOf(id);
    expect(inv).toMatchObject({ status: 'draft', due_date: '2026-02-16' });
  });

  it('HTTP: run (admin only), list runs, invoice now, confirm, cancel', async () => {
    const id = await makeSubscription(user, {
      customerId: customer.id,
      planId: cat.plans.crmMonthly.id,
      startDate: '2026-01-01',
    });
    await request(app).post('/api/billing/run').set('Authorization', staff.auth).send({}).expect(403);
    const run = await request(app)
      .post('/api/billing/run')
      .set('Authorization', admin.auth)
      .send({ asOfDate: '2026-01-15' });
    expect(run.status).toBe(201);
    expect(run.body.data.generated).toBe(1);

    const runs = await request(app).get('/api/billing/runs').set('Authorization', staff.auth);
    expect(runs.body.meta.total).toBe(1);
    const one = await request(app)
      .get(`/api/billing/runs/${run.body.data.id}`)
      .set('Authorization', staff.auth);
    expect(one.body.data.invoiceCount).toBe(1);

    const now = await request(app).post(`/api/subscriptions/${id}/invoices`).set('Authorization', staff.auth);
    expect(now.status).toBe(201);
    expect(now.body.data).toMatchObject({ periodStart: '2026-02-01', total: '1180.00', status: 'confirmed' });
    expect(now.body.data.lines[0].taxes[0]).toMatchObject({ taxName: 'GST 18%', amount: '180.00' });

    const list = await request(app)
      .get(`/api/invoices?subscriptionId=${id}&sort=invoiceDate`)
      .set('Authorization', staff.auth);
    expect(list.body.meta).toMatchObject({ total: 2, statusCounts: { confirmed: 2 } });
    expect(list.body.meta.totals).toEqual({ total: '2360.00', amountPaid: '0.00', amountDue: '2360.00' });
    expect(list.body.data[0].periodStart).toBe('2026-01-01');

    const cancelled = await request(app)
      .post(`/api/invoices/${now.body.data.id}/cancel`)
      .set('Authorization', staff.auth);
    expect(cancelled.body.data.status).toBe('cancelled');
    await request(app)
      .post(`/api/invoices/${now.body.data.id}/confirm`)
      .set('Authorization', staff.auth)
      .expect(422);
    // The subscription is not rewound.
    expect(await subRow(id)).toMatchObject({ periods_billed: 2, next_invoice_date: '2026-03-01' });

    const detail = await request(app).get(`/api/subscriptions/${id}`).set('Authorization', staff.auth);
    expect(detail.body.data.totals).toMatchObject({ periodStart: '2026-03-01', total: '1180.00' });
    expect(detail.body.data.recentInvoices).toHaveLength(2);
  });
});
