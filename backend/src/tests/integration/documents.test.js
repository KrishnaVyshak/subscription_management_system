import request from 'supertest';
import { beforeEach, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { query } from '../../config/db.js';
import { runBilling } from '../../modules/billing/service.js';
import { makeUser } from '../helpers/auth.js';
import { describeDb, useDb } from '../helpers/db.js';
import { makeCustomer, makeSubscription, seedCatalog } from '../helpers/fixtures.js';

const app = createApp();

// supertest buffers binary bodies with this parser.
const binary = (res, cb) => {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describeDb('PDF, email and CSV', () => {
  useDb();
  let staff;
  let ids;

  beforeEach(async () => {
    staff = await makeUser('staff');
    const cat = await seedCatalog();
    const customer = await makeCustomer('Acme, "Corp"', 'billing@acme.test');
    await query(`update settings set value = 'false' where key = 'invoice.auto_confirm'`);
    const subId = await makeSubscription(
      { id: staff.id, role: 'staff' },
      { customerId: customer.id, planId: cat.plans.crmMonthly.id, startDate: '2026-01-01' },
    );
    await runBilling({ asOfDate: '2026-02-01' });
    ids = (await query('select id from invoices where subscription_id = $1 order by period_start', [subId])).rows.map(
      (r) => r.id,
    );
  });

  const api = (method, path) => request(app)[method](`/api/${path}`).set('Authorization', staff.auth);

  it('renders a PDF from the snapshot', async () => {
    const res = await api('get', `invoices/${ids[0]}/pdf`).buffer(true).parse(binary);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toMatch(/INV-\d{4}-\d{5}\.pdf/);
    expect(res.body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(res.body.length).toBeGreaterThan(1500);
  });

  it('send confirms a draft, emails (logged without SMTP) and sets sentAt', async () => {
    const res = await api('post', `invoices/${ids[0]}/send`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'confirmed', email: { logged: true } });
    expect(res.body.data.sentAt).toBeTruthy();

    const bulk = await api('post', 'invoices/send-bulk').send({ invoiceIds: ids });
    expect(bulk.body.data).toMatchObject({ sent: 2, failed: 0 });

    await api('post', `invoices/${ids[1]}/cancel`).expect(200);
    const failed = await api('post', 'invoices/send-bulk').send({ invoiceIds: [ids[1]] });
    expect(failed.body.data).toMatchObject({ sent: 0, failed: 1 });
  });

  it('reminds overdue invoices only', async () => {
    await api('post', `invoices/${ids[0]}/confirm`).expect(200);
    // Due 2026-01-01, so overdue by now.
    const ok = await api('post', `invoices/${ids[0]}/remind`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.email.logged).toBe(true);

    const draft = await api('post', `invoices/${ids[1]}/remind`);
    expect(draft.status).toBe(422);
    expect(draft.body.error.details.rule).toBe('NOT_OVERDUE');
  });

  it('exports CSV with escaping', async () => {
    const res = await api('get', 'invoices?format=csv&sort=invoiceDate');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/csv/);
    const lines = res.text.trim().split('\r\n');
    expect(lines[0]).toBe(
      'Number,Status,Overdue,Days overdue,Customer,Subscription,Invoice date,Due date,Period start,Period end,Subtotal,Discount,Tax,Total,Paid,Due',
    );
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain('"Acme, ""Corp"""');
    expect(lines[1]).toContain(',2026-01-01,');
  });
});
