import request from 'supertest';
import { beforeEach, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { query } from '../../config/db.js';
import { runBilling } from '../../modules/billing/service.js';
import { makeUser } from '../helpers/auth.js';
import { describeDb, useDb } from '../helpers/db.js';
import { makeCustomer, makeSubscription, seedCatalog } from '../helpers/fixtures.js';

const app = createApp();

describeDb('discounts', () => {
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

  const api = (method, path, who = admin) =>
    request(app)[method](`/api/${path}`).set('Authorization', who.auth);

  it('validates and locks rules; staff cannot write', async () => {
    await api('post', 'discounts', staff)
      .send({ name: 'x', type: 'fixed', value: 1, scope: 'subscription' })
      .expect(403);
    await api('post', 'discounts')
      .send({ name: 'x', type: 'percent', value: 10, scope: 'product' })
      .expect(400);
    await api('post', 'discounts')
      .send({
        name: 'x',
        type: 'fixed',
        value: 1,
        scope: 'subscription',
        startDate: '2026-02-01',
        endDate: '2026-01-01',
      })
      .expect(400);

    const created = await api('post', 'discounts').send({
      name: 'Bulk CRM',
      type: 'percent',
      value: '10',
      scope: 'product',
      minQuantity: 10,
      productIds: [cat.products.crm],
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ state: 'active', value: '10.00' });
    expect(created.body.data.products).toEqual([{ id: cat.products.crm, name: 'CRM Suite' }]);

    const id = created.body.data.id;
    await query('update discounts set usage_count = 1 where id = $1', [id]);
    const locked = await api('patch', `discounts/${id}`).send({ value: '15' });
    expect(locked.status).toBe(422);
    expect(locked.body.error.details.rule).toBe('DISCOUNT_IN_USE');
    await api('patch', `discounts/${id}`).send({ name: 'Bulk CRM 2026', endDate: '2099-12-31' }).expect(200);

    const list = await api('get', 'discounts?state=active', staff);
    expect(list.body.data.map((d) => d.name)).toEqual(['Bulk CRM 2026']);
  });

  it('10% at qty ≥ 10 applies automatically to CRM lines', async () => {
    await api('post', 'discounts').send({
      name: 'Bulk CRM',
      type: 'percent',
      value: 10,
      scope: 'product',
      minQuantity: 10,
      productIds: [cat.products.crm],
    });
    const small = await makeSubscription(user, {
      customerId: customer.id,
      planId: cat.plans.crmMonthly.id,
      startDate: '2026-01-01',
    });
    const big = await makeSubscription(user, {
      customerId: customer.id,
      planId: cat.plans.crmMonthly.id,
      startDate: '2026-01-01',
      lines: [{ productId: cat.products.crm, quantity: 10 }],
    });
    await runBilling({ asOfDate: '2026-01-01' });
    const totals = async (subId) =>
      (await query('select subtotal, discount_total, tax_total, total from invoices where subscription_id = $1', [subId]))
        .rows[0];
    expect(await totals(small)).toMatchObject({ discount_total: '0.00', total: '1180.00' });
    expect(await totals(big)).toMatchObject({
      subtotal: '10000.00',
      discount_total: '1000.00',
      tax_total: '1620.00',
      total: '10620.00',
    });
  });

  it('a ₹500 discount with limit 2 is used exactly twice; cancelling frees a use', async () => {
    const created = await api('post', 'discounts').send({
      name: 'Welcome ₹500',
      type: 'fixed',
      value: 500,
      scope: 'subscription',
      usageLimit: 2,
    });
    const discountId = created.body.data.id;
    const subId = await makeSubscription(user, {
      customerId: customer.id,
      planId: cat.plans.crmMonthly.id,
      startDate: '2026-01-01',
    });
    await api('post', `subscriptions/${subId}/discounts`, staff).send({ discountId }).expect(403);
    const attached = await api('post', `subscriptions/${subId}/discounts`).send({ discountId });
    expect(attached.status).toBe(201);
    expect(attached.body.data.discounts.map((d) => d.id)).toEqual([discountId]);
    expect(attached.body.data.totals).toMatchObject({ discountTotal: '500.00', total: '590.00' });
    await api('post', `subscriptions/${subId}/discounts`).send({ discountId }).expect(409);

    await runBilling({ asOfDate: '2026-03-01' });
    const { rows } = await query(
      `select id, period_start, discount_total, total from invoices where subscription_id = $1 order by period_start`,
      [subId],
    );
    expect(rows.map((r) => [r.period_start, r.discount_total, r.total])).toEqual([
      ['2026-01-01', '500.00', '590.00'],
      ['2026-02-01', '500.00', '590.00'],
      ['2026-03-01', '0.00', '1180.00'],
    ]);
    const disc = async () => (await api('get', `discounts/${discountId}`, staff)).body.data;
    expect(await disc()).toMatchObject({ usageCount: 2, state: 'exhausted', totalDiscounted: '1000.00' });

    const inv = await api('get', `invoices/${rows[1].id}`, staff);
    expect(inv.body.data.discounts).toEqual([
      expect.objectContaining({ discountId, amount: '500.00', name: 'Welcome ₹500' }),
    ]);

    await api('post', `invoices/${rows[1].id}/cancel`, staff).expect(200);
    expect(await disc()).toMatchObject({ usageCount: 1, state: 'active' });

    // The freed use is taken by the next period.
    await runBilling({ asOfDate: '2026-04-01' });
    const april = await query(
      `select discount_total from invoices where subscription_id = $1 and period_start = '2026-04-01'`,
      [subId],
    );
    expect(april.rows[0].discount_total).toBe('500.00');
    expect(await disc()).toMatchObject({ usageCount: 2 });

    await api('delete', `subscriptions/${subId}/discounts/${discountId}`).expect(200);
  });

  it('rejects attaching a product discount', async () => {
    const prod = await api('post', 'discounts').send({
      name: 'P',
      type: 'percent',
      value: 5,
      scope: 'product',
      productIds: [cat.products.hr],
    });
    const subId = await makeSubscription(user, {
      customerId: customer.id,
      planId: cat.plans.crmMonthly.id,
      startDate: '2026-01-01',
    });
    const res = await api('post', `subscriptions/${subId}/discounts`).send({ discountId: prod.body.data.id });
    expect(res.status).toBe(422);
    expect(res.body.error.details.rule).toBe('DISCOUNT_SCOPE');
  });
});
