import request from 'supertest';
import { beforeEach, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { query } from '../../config/db.js';
import { todayIST } from '../../lib/dates.js';
import { runBilling } from '../../modules/billing/service.js';
import { makeUser } from '../helpers/auth.js';
import { describeDb, useDb } from '../helpers/db.js';
import { makeSubscription, seedCatalog } from '../helpers/fixtures.js';

const app = createApp();

describeDb('portal and RBAC', () => {
  useDb();
  let staff;
  let alice;
  let bob;
  let cat;
  let aliceSub;
  let bobSub;
  let bobInvoice;

  beforeEach(async () => {
    staff = await makeUser('staff');
    alice = await makeUser('customer', { fullName: 'Alice' });
    bob = await makeUser('customer', { fullName: 'Bob' });
    cat = await seedCatalog();
    const user = { id: staff.id, role: 'staff' };
    const start = todayIST();
    aliceSub = await makeSubscription(user, {
      customerId: alice.customerId,
      planId: cat.plans.crmMonthly.id,
      startDate: start,
    });
    bobSub = await makeSubscription(user, {
      customerId: bob.customerId,
      planId: cat.plans.crmMonthly.id,
      startDate: start,
    });
    await runBilling({ asOfDate: start });
    bobInvoice = (await query('select id from invoices where subscription_id = $1', [bobSub])).rows[0].id;
  });

  const as = (who, method, path) => request(app)[method](`/api/${path}`).set('Authorization', who.auth);

  it('customers reach /portal only; staff cannot use the portal', async () => {
    for (const path of ['subscriptions', 'customers', 'invoices', 'payments', 'products', 'receivables/summary', 'reports/summary']) {
      expect((await as(alice, 'get', path)).status).toBe(403);
    }
    await as(alice, 'post', 'billing/run').send({}).expect(403);
    await as(staff, 'get', 'portal/overview').expect(403);
    await as(staff, 'post', 'products').send({ name: 'X', salesPrice: 1 }).expect(403);
    await as(staff, 'post', 'discounts').send({}).expect(403);
  });

  it("customer A gets 404 on customer B's data", async () => {
    await as(alice, 'get', `portal/subscriptions/${bobSub}`).expect(404);
    await as(alice, 'get', `portal/invoices/${bobInvoice}`).expect(404);
    await as(alice, 'get', `portal/invoices/${bobInvoice}/pdf`).expect(404);
    await as(alice, 'post', `portal/subscriptions/${bobSub}/pause`).send({}).expect(404);
    await as(alice, 'post', `portal/subscriptions/${bobSub}/addons`)
      .send({ add: [{ productId: cat.products.storage }] })
      .expect(404);

    const subs = await as(alice, 'get', 'portal/subscriptions');
    expect(subs.body.data.map((s) => s.id)).toEqual([aliceSub]);
    const invoices = await as(alice, 'get', 'portal/invoices');
    expect(invoices.body.meta.total).toBe(1);
    expect(invoices.body.data[0].subscriptionId).toBe(aliceSub);
  });

  it('overview, profile and payments', async () => {
    const overview = await as(alice, 'get', 'portal/overview');
    expect(overview.body.data).toMatchObject({ activeSubscriptions: 1, outstandingAmount: '1180.00' });
    expect(overview.body.data.recentInvoices).toHaveLength(1);

    const profile = await as(alice, 'patch', 'portal/profile').send({
      fullName: 'Alice A.',
      phone: '+91 98450 00000',
      email: 'hacker@x.test',
    });
    expect(profile.status).toBe(200);
    expect(profile.body.data).toMatchObject({ fullName: 'Alice A.', phone: '+91 98450 00000', email: alice.email });

    const inv = (await query('select id from invoices where subscription_id = $1', [aliceSub])).rows[0].id;
    await as(staff, 'post', `invoices/${inv}/payments`).send({ method: 'card', amount: 100 }).expect(201);
    const pays = await as(alice, 'get', 'portal/payments');
    expect(pays.body.meta).toMatchObject({ total: 1, totalAmount: '100.00' });
    expect((await as(bob, 'get', 'portal/payments')).body.meta.total).toBe(0);
  });

  it('pause, resume, add-ons and cancel follow plan flags', async () => {
    let detail = await as(alice, 'get', `portal/subscriptions/${aliceSub}`);
    expect(detail.body.data.allowedActions).toEqual(['pause', 'cancel', 'addons']);
    expect(detail.body.data).not.toHaveProperty('notes');

    const kit = await as(alice, 'post', `portal/subscriptions/${aliceSub}/addons`).send({
      add: [{ productId: cat.products.kit }],
    });
    expect(kit.body.error.details.rule).toBe('ADDON_ONLY');
    const added = await as(alice, 'post', `portal/subscriptions/${aliceSub}/addons`).send({
      add: [{ productId: cat.products.storage, quantity: 2 }],
    });
    expect(added.status).toBe(200);
    const storage = added.body.data.lines.find((l) => l.description === 'Extra Storage');
    expect(storage.startsOn).toBe(added.body.data.nextInvoiceDate); // next period

    await as(alice, 'post', `portal/subscriptions/${aliceSub}/resume`).send({}).expect(422);
    detail = await as(alice, 'post', `portal/subscriptions/${aliceSub}/pause`).send({ note: 'holiday' });
    expect(detail.body.data.status).toBe('paused');
    detail = await as(alice, 'post', `portal/subscriptions/${aliceSub}/resume`).send({});
    expect(detail.body.data.status).toBe('active');
    detail = await as(alice, 'post', `portal/subscriptions/${aliceSub}/cancel`).send({});
    expect(detail.body.data).toMatchObject({ status: 'closed', closeReason: 'customer_cancelled' });

    // HR Weekly is neither pausable nor closable.
    const hr = await makeSubscription(
      { id: staff.id, role: 'staff' },
      {
        customerId: bob.customerId,
        planId: cat.plans.hrWeekly.id,
        startDate: todayIST(),
        lines: [{ productId: cat.products.hr, quantity: 5 }],
      },
    );
    expect((await as(bob, 'post', `portal/subscriptions/${hr}/pause`).send({})).body.error.details.rule).toBe(
      'PLAN_NOT_PAUSABLE',
    );
    expect((await as(bob, 'post', `portal/subscriptions/${hr}/cancel`).send({})).body.error.details.rule).toBe(
      'PLAN_NOT_CLOSABLE',
    );
  });

  it('hides drafts', async () => {
    const draft = await makeSubscription(
      { id: staff.id, role: 'staff' },
      { customerId: alice.customerId, planId: cat.plans.crmMonthly.id, startDate: todayIST(), status: 'draft' },
    );
    await as(alice, 'get', `portal/subscriptions/${draft}`).expect(404);
    const list = await as(alice, 'get', 'portal/subscriptions');
    expect(list.body.meta.total).toBe(1);
    expect(list.body.meta.statusCounts).toEqual({ active: 1 });
  });
});
