import request from 'supertest';
import { beforeEach, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { makeUser } from '../helpers/auth.js';
import { describeDb, useDb } from '../helpers/db.js';

const app = createApp();

describeDb('catalog', () => {
  useDb();
  let admin;
  let staff;
  let customer;

  beforeEach(async () => {
    admin = await makeUser('admin');
    staff = await makeUser('staff');
    customer = await makeUser('customer');
  });

  const post = (path, body, who = admin) =>
    request(app).post(`/api/${path}`).set('Authorization', who.auth).send(body);

  it('creates a product with a Brand variant priced at 1560 and its taxes', async () => {
    const gst = await post('taxes', { name: 'GST 18%', type: 'percent', rate: 18 }).expect(201);
    const brand = await post('attributes', {
      name: 'Brand',
      values: [
        { value: 'Odoo', extraPrice: '560' },
        { value: 'Generic', extraPrice: 0 },
      ],
    }).expect(201);
    const odoo = brand.body.data.values.find((v) => v.value === 'Odoo');

    const product = await post('products', {
      name: 'CRM Suite',
      type: 'service',
      salesPrice: '1000',
      taxIds: [gst.body.data.id],
    }).expect(201);
    const pid = product.body.data.id;
    expect(product.body.data.salesPrice).toBe('1000.00');
    expect(product.body.data.taxes).toHaveLength(1);

    const variant = await post(`products/${pid}/variants`, { attributeValueIds: [odoo.id] });
    expect(variant.status).toBe(201);
    expect(variant.body.data).toMatchObject({ name: 'CRM Suite (Odoo)', price: '1560.00' });

    const dup = await post(`products/${pid}/variants`, { attributeValueIds: [odoo.id] });
    expect(dup.status).toBe(409);

    const detail = await request(app).get(`/api/products/${pid}`).set('Authorization', staff.auth);
    expect(detail.status).toBe(200);
    expect(detail.body.data.variants[0].price).toBe('1560.00');

    const cleared = await request(app)
      .put(`/api/products/${pid}/taxes`)
      .set('Authorization', admin.auth)
      .send({ taxIds: [] });
    expect(cleared.body.data.taxes).toHaveLength(0);
  });

  it('lets staff read but not write; customers get 403', async () => {
    await request(app).get('/api/products').set('Authorization', staff.auth).expect(200);
    await post('products', { name: 'X', salesPrice: 1 }, staff).expect(403);
    await post('plans', {}, staff).expect(403);
    await post('taxes', { name: 'T', type: 'fixed', rate: 1 }, staff).expect(403);
    await request(app).get('/api/products').set('Authorization', customer.auth).expect(403);
    await request(app)
      .put('/api/settings/invoice.auto_confirm')
      .set('Authorization', staff.auth)
      .send({ value: false })
      .expect(403);
  });

  it('validates plans and filters by availability', async () => {
    const product = await post('products', { name: 'HR Cloud', salesPrice: '800' }).expect(201);
    const productId = product.body.data.id;
    await post('plans', {
      name: 'Bad',
      productId,
      price: '800',
      billingPeriod: 'monthly',
      availableFrom: '2026-02-01',
      availableTo: '2026-01-01',
    }).expect(400);
    await post('plans', {
      name: 'Zero qty',
      productId,
      price: '800',
      billingPeriod: 'monthly',
      minQuantity: 0,
    }).expect(400);

    await post('plans', { name: 'Now', productId, price: '800', billingPeriod: 'monthly' }).expect(201);
    await post('plans', {
      name: 'Old',
      productId,
      price: '800',
      billingPeriod: 'weekly',
      availableFrom: '2020-01-01',
      availableTo: '2020-12-31',
    }).expect(201);

    const all = await request(app).get('/api/plans').set('Authorization', staff.auth);
    expect(all.body.meta.total).toBe(2);
    const available = await request(app)
      .get('/api/plans?available=true')
      .set('Authorization', staff.auth);
    expect(available.body.data.map((p) => p.name)).toEqual(['Now']);
    expect(available.body.data[0].productName).toBe('HR Cloud');
  });

  it('soft-deletes and hides inactive rows by default', async () => {
    const term = await post('payment-terms', { name: 'Net 15', dueDays: 15 }).expect(201);
    await request(app)
      .delete(`/api/payment-terms/${term.body.data.id}`)
      .set('Authorization', admin.auth)
      .expect(200);
    const list = await request(app).get('/api/payment-terms').set('Authorization', staff.auth);
    expect(list.body.meta.total).toBe(0);
    const withInactive = await request(app)
      .get('/api/payment-terms?includeInactive=true')
      .set('Authorization', staff.auth);
    expect(withInactive.body.data[0].isActive).toBe(false);
  });

  it('reads and updates settings', async () => {
    const res = await request(app)
      .put('/api/settings/invoice.auto_confirm')
      .set('Authorization', admin.auth)
      .send({ value: false });
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe(false);
    const list = await request(app).get('/api/settings').set('Authorization', staff.auth);
    expect(list.body.data.map((s) => s.key)).toContain('company');
  });
});
