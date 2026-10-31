import request from 'supertest';
import { beforeEach, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { query } from '../../config/db.js';
import { runDailyJobs } from '../../jobs/daily.js';
import { runBilling } from '../../modules/billing/service.js';
import { record as recordPayment } from '../../modules/payments/service.js';
import * as reports from '../../modules/reports/service.js';
import { makeUser } from '../helpers/auth.js';
import { describeDb, useDb } from '../helpers/db.js';
import { makeCustomer, makeSubscription, seedCatalog } from '../helpers/fixtures.js';

const app = createApp();

describeDb('reports and daily jobs', () => {
  useDb();
  let admin;
  let staff;
  let user;
  let cat;

  beforeEach(async () => {
    admin = await makeUser('admin');
    staff = await makeUser('staff');
    user = { id: staff.id, role: 'staff' };
    cat = await seedCatalog();
  });

  const as = (who, method, path) => request(app)[method](`/api/${path}`).set('Authorization', who.auth);

  // Fixture: A has CRM Monthly (from 1 Jan) and CRM Yearly (from 15 Jan); B has a paused
  // HR Weekly and a CRM Monthly closed on 1 Feb. Billed through 31 Mar; two invoices paid.
  async function fixture() {
    const a = await makeCustomer('Acme');
    const b = await makeCustomer('Beta');
    const monthly = await makeSubscription(user, { customerId: a.id, planId: cat.plans.crmMonthly.id, startDate: '2026-01-01' });
    const yearly = await makeSubscription(user, { customerId: a.id, planId: cat.plans.crmYearly.id, startDate: '2026-01-15' });
    await makeSubscription(user, {
      customerId: b.id,
      planId: cat.plans.hrWeekly.id,
      startDate: '2026-01-01',
      lines: [{ productId: cat.products.hr, quantity: 5 }],
    });
    // HR Weekly is not pausable, so pause it directly for the fixture.
    await query(
      `update subscriptions set status = 'paused', paused_at = '2026-01-01' where plan_id = $1`,
      [cat.plans.hrWeekly.id],
    );
    await makeSubscription(user, { customerId: b.id, planId: cat.plans.crmMonthly.id, startDate: '2026-02-01', status: 'closed' });
    await runBilling({ asOfDate: '2026-03-31' });
    const inv = async (subId, start) =>
      (await query('select id from invoices where subscription_id = $1 and period_start = $2', [subId, start])).rows[0].id;
    await recordPayment(await inv(monthly, '2026-01-01'), { method: 'upi', amount: '1180', paymentDate: '2026-01-05' }, user, '2026-12-31');
    await recordPayment(await inv(yearly, '2026-01-15'), { method: 'bank_transfer', amount: '11800', paymentDate: '2026-02-10' }, user, '2026-12-31');
    return { a, b };
  }

  it('summary totals match the fixture', async () => {
    const { a } = await fixture();
    const res = await as(staff, 'get', 'reports/summary?from=2026-01-01&to=2026-03-31');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      from: '2026-01-01',
      to: '2026-03-31',
      activeSubscriptions: 2,
      pausedSubscriptions: 1,
      mrr: '1833.33',
      arr: '22000.00',
      invoiced: '15340.00',
      collected: '12980.00',
      outstanding: '2360.00',
      overdue: '2360.00',
      overdueInvoices: 2,
      newSubscriptions: 4,
      churnedSubscriptions: 1,
    });

    const onlyA = await as(staff, 'get', `reports/summary?from=2026-02-01&to=2026-02-28&customerId=${a.id}`);
    expect(onlyA.body.data).toMatchObject({ invoiced: '1180.00', collected: '11800.00', newSubscriptions: 0 });
    await as(staff, 'get', 'reports/summary?from=2026-03-01&to=2026-01-01').expect(400);
  });

  it('revenue trend includes empty months', async () => {
    await fixture();
    const trend = await reports.revenueTrend({ months: 6 }, '2026-03-31');
    expect(trend).toEqual([
      { month: '2025-10', invoiced: '0', invoices: 0, collected: '0' },
      { month: '2025-11', invoiced: '0', invoices: 0, collected: '0' },
      { month: '2025-12', invoiced: '0', invoices: 0, collected: '0' },
      { month: '2026-01', invoiced: '12980.00', invoices: 2, collected: '1180.00' },
      { month: '2026-02', invoiced: '1180.00', invoices: 1, collected: '11800.00' },
      { month: '2026-03', invoiced: '1180.00', invoices: 1, collected: '0' },
    ]);
    const res = await as(staff, 'get', 'reports/revenue-trend?months=12');
    expect(res.body.data).toHaveLength(12);
  });

  it('by plan and top customers', async () => {
    await fixture();
    const byPlan = await as(staff, 'get', 'reports/by-plan?from=2026-01-01&to=2026-03-31');
    expect(byPlan.body.data.rows.map((r) => [r.planName, r.activeSubscriptions, r.pausedSubscriptions, r.mrr, r.invoiced])).toEqual([
      ['CRM Monthly', 1, 0, '1000.00', '3540.00'],
      ['CRM Yearly', 1, 0, '833.33', '11800.00'],
      ['HR Weekly', 0, 1, '0.00', '0'],
    ]);
    const top = await as(staff, 'get', 'reports/top-customers?from=2026-01-01&to=2026-03-31');
    expect(top.body.data.rows).toEqual([
      expect.objectContaining({ name: 'Acme', invoiced: '15340.00', paid: '12980.00', outstanding: '2360.00', invoices: 4 }),
    ]);
  });

  it('daily jobs run in order and are idempotent', async () => {
    const c = await makeCustomer('Gamma');
    const quote = await makeSubscription(user, { customerId: c.id, planId: cat.plans.crmMonthly.id, startDate: '2026-02-01', status: 'quotation' });
    await query(`update subscriptions set quote_valid_until = '2026-02-10' where id = $1`, [quote]);
    const confirmed = await makeSubscription(user, { customerId: c.id, planId: cat.plans.crmMonthly.id, startDate: '2026-02-15', status: 'confirmed' });
    const yearly = await makeSubscription(user, {
      customerId: c.id,
      planId: cat.plans.crmYearly.id,
      startDate: '2025-02-01',
      expiryDate: '2026-01-31',
    });
    const monthlyExpired = await makeSubscription(user, {
      customerId: c.id,
      planId: cat.plans.crmMonthly.id,
      startDate: '2026-01-01',
      expiryDate: '2026-01-31',
    });
    await query(
      `insert into discounts (name, type, value, scope, end_date) values ('Old', 'percent', 5, 'subscription', '2026-01-01')`,
    );
    await query(
      `insert into discounts (name, type, value, scope, usage_limit, usage_count) values ('Used up', 'fixed', 5, 'subscription', 1, 1)`,
    );

    const first = await runDailyJobs('2026-03-01');
    expect(first.results['expire-quotations'].processed).toBe(1);
    expect(first.results['activate-subscriptions'].processed).toBe(1);
    expect(first.results['run-billing'].processed).toBe(3); // confirmed: 15 Feb; yearly: Feb 2025; monthly: Jan
    expect(first.results['auto-close'].processed).toBe(1);
    expect(first.results['deactivate-discounts'].processed).toBe(2);

    const status = async (id) => (await query('select status, close_reason from subscriptions where id = $1', [id])).rows[0];
    expect(await status(quote)).toEqual({ status: 'closed', close_reason: 'quote_expired' });
    expect((await status(confirmed)).status).toBe('active');
    expect(await status(yearly)).toEqual({ status: 'closed', close_reason: 'expired' });
    expect((await status(monthlyExpired)).status).toBe('active'); // plan does not auto-close

    const second = await runDailyJobs('2026-03-01');
    for (const r of Object.values(second.results)) expect(r.processed).toBe(0);

    await as(staff, 'post', 'jobs/daily/run').send({}).expect(403);
    const http = await as(admin, 'post', 'jobs/run-billing/run').send({ asOfDate: '2026-03-01' });
    expect(http.status).toBe(200);
    expect(http.body.data.results['run-billing'].processed).toBe(0);
  });
});
