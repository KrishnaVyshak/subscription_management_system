import request from 'supertest';
import { beforeEach, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { query } from '../../config/db.js';
import { todayIST } from '../../lib/dates.js';
import * as subscriptions from '../../modules/subscriptions/service.js';
import { makeUser } from '../helpers/auth.js';
import { describeDb, useDb } from '../helpers/db.js';
import { makeCustomer, seedCatalog } from '../helpers/fixtures.js';

const app = createApp();

describeDb('customers, templates and subscriptions', () => {
  useDb();
  let admin;
  let staff;
  let cat;
  let customer;

  beforeEach(async () => {
    admin = await makeUser('admin');
    staff = await makeUser('staff');
    cat = await seedCatalog();
    customer = await makeCustomer('Acme Corp');
  });

  const api = (method, path, who = staff) =>
    request(app)[method](`/api/${path}`).set('Authorization', who.auth);

  it('customers: create, trigram search, detail counts, invite', async () => {
    const created = await api('post', 'customers').send({
      name: 'Brightwave Labs',
      email: 'Ops@Brightwave.test',
      gstin: '29abcde1234f1z5',
    });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ email: 'ops@brightwave.test', gstin: '29ABCDE1234F1Z5' });
    await api('post', 'customers').send({ name: 'Dup', email: 'ops@brightwave.test' }).expect(409);

    const search = await api('get', 'customers?search=brightwav');
    expect(search.body.data.map((c) => c.name)).toEqual(['Brightwave Labs']);

    const id = created.body.data.id;
    const invite = await api('post', `customers/${id}/invite`);
    expect(invite.status).toBe(201);
    expect(invite.body.data.hasPortal).toBe(true);
    await api('post', `customers/${id}/invite`).expect(409);

    const detail = await api('get', `customers/${id}`);
    expect(detail.body.data).toMatchObject({ activeSubscriptions: 0, hasPortal: true });
  });

  it('creates a subscription with a plan line at min quantity and a SUB number', async () => {
    const res = await api('post', 'subscriptions').send({
      customerId: customer.id,
      planId: cat.plans.hrWeekly.id,
    });
    expect(res.status).toBe(201);
    const sub = res.body.data;
    expect(sub.number).toMatch(/^SUB\/\d{4}\/\d{5}$/);
    expect(sub.status).toBe('draft');
    expect(sub.lines).toHaveLength(1);
    expect(sub.lines[0]).toMatchObject({ isPlanLine: true, quantity: 5, unitPrice: '200.00' });
    expect(sub.lines[0].taxes[0].name).toBe('GST 18%');
    expect(sub.history[0]).toMatchObject({ fromStatus: null, toStatus: 'draft' });
    expect(sub.allowedActions).toEqual(['quotation', 'closed', 'edit']);
  });

  it('creates from a template: plan, term, lines and quote validity', async () => {
    const tpl = await api('post', 'templates', admin).send({
      name: 'CRM starter',
      planId: cat.plans.crmMonthly.id,
      paymentTermId: cat.terms.net15,
      validityDays: 10,
      lines: [
        { productId: cat.products.crm, quantity: 3 },
        { productId: cat.products.storage, quantity: 2, unitPrice: '150' },
      ],
    });
    expect(tpl.status).toBe(201);
    await api('post', 'templates').send({ name: 'x', planId: cat.plans.crmMonthly.id }).expect(403);

    const res = await api('post', 'subscriptions').send({
      customerId: customer.id,
      templateId: tpl.body.data.id,
    });
    expect(res.status).toBe(201);
    const sub = res.body.data;
    expect(sub.planId).toBe(cat.plans.crmMonthly.id);
    expect(sub.paymentTermId).toBe(cat.terms.net15);
    expect(sub.quoteValidUntil > todayIST()).toBe(true);
    expect(sub.lines.map((l) => [l.description, l.quantity, l.unitPrice, l.isPlanLine])).toEqual([
      ['CRM Suite', 3, '1000.00', true],
      ['Extra Storage', 2, '150.00', false],
    ]);
  });

  it('runs the lifecycle draft → quotation → confirmed → active → closed', async () => {
    const created = await api('post', 'subscriptions').send({
      customerId: customer.id,
      planId: cat.plans.hrWeekly.id,
      startDate: '2026-01-05',
    });
    const id = created.body.data.id;
    const move = (to, body = {}) => api('post', `subscriptions/${id}/transition`).send({ to, ...body });

    // Below min quantity → 422 MIN_QUANTITY.
    await api('patch', `subscriptions/${id}`)
      .send({ lines: [{ productId: cat.products.hr, quantity: 2 }] })
      .expect(200);
    const low = await move('quotation');
    expect(low.status).toBe(422);
    expect(low.body.error.details.rule).toBe('MIN_QUANTITY');

    await api('patch', `subscriptions/${id}`)
      .send({ lines: [{ productId: cat.products.hr, quantity: 6 }] })
      .expect(200);
    await move('quotation').expect(200);
    await move('confirmed').expect(200);
    const active = await move('active');
    expect(active.body.data).toMatchObject({
      status: 'active',
      billingAnchorDate: '2026-01-05',
      nextInvoiceDate: '2026-01-05',
      periodsBilled: 0,
    });

    // HR Weekly is not pausable and not closable.
    expect((await move('paused')).body.error.details.rule).toBe('PLAN_NOT_PAUSABLE');
    expect((await move('closed')).body.error.details.rule).toBe('PLAN_NOT_CLOSABLE');
    // Staff cannot force; admin can.
    expect((await move('closed', { force: true })).status).toBe(422);
    const closed = await api('post', `subscriptions/${id}/transition`, admin).send({
      to: 'closed',
      force: true,
      reason: 'customer_request',
    });
    expect(closed.status).toBe(200);
    expect(closed.body.data).toMatchObject({
      status: 'closed',
      closeReason: 'customer_request',
      nextInvoiceDate: null,
    });
    expect(closed.body.data.history.map((h) => h.toStatus)).toEqual([
      'draft',
      'quotation',
      'confirmed',
      'active',
      'closed',
    ]);
    await api('patch', `subscriptions/${id}`).send({ notes: 'x' }).expect(422);
  });

  it('rejects confirming an expired quotation', async () => {
    const created = await api('post', 'subscriptions').send({
      customerId: customer.id,
      planId: cat.plans.crmMonthly.id,
      quoteValidUntil: '2020-01-01',
    });
    const id = created.body.data.id;
    await api('post', `subscriptions/${id}/transition`).send({ to: 'quotation' }).expect(200);
    const res = await api('post', `subscriptions/${id}/transition`).send({ to: 'confirmed' });
    expect(res.status).toBe(422);
    expect(res.body.error.details.rule).toBe('QUOTE_EXPIRED');
  });

  async function activeSub(planId, startDate) {
    const user = { id: staff.id, role: 'staff' };
    const sub = await subscriptions.create({ customerId: customer.id, planId, startDate }, user);
    for (const to of ['quotation', 'confirmed', 'active']) {
      await subscriptions.transition(sub.id, { to }, user, startDate);
    }
    return sub.id;
  }

  it('pause/resume shifts the anchor by the paused days', async () => {
    const user = { id: staff.id, role: 'staff' };
    const id = await activeSub(cat.plans.crmMonthly.id, '2026-01-31');
    // Pretend January was billed.
    await query(
      `update subscriptions set periods_billed = 1, next_invoice_date = '2026-02-28' where id = $1`,
      [id],
    );
    let sub = await subscriptions.transition(id, { to: 'paused' }, user, '2026-02-10');
    expect(sub).toMatchObject({ status: 'paused', paused_at: '2026-02-10' });
    expect(sub.allowed_actions).toContain('active');

    sub = await subscriptions.transition(id, { to: 'active' }, user, '2026-02-20');
    expect(sub).toMatchObject({
      status: 'active',
      paused_at: null,
      billing_anchor_date: '2026-02-10',
      next_invoice_date: '2026-03-10',
    });
  });

  it('running edits take effect next period; add-ons only', async () => {
    const id = await activeSub(cat.plans.crmMonthly.id, '2026-01-01');
    await query(
      `update subscriptions set periods_billed = 2, next_invoice_date = '2026-03-01' where id = $1`,
      [id],
    );
    const detail = await api('get', `subscriptions/${id}`);
    const planLine = detail.body.data.lines.find((l) => l.isPlanLine);

    await api('patch', `subscriptions/${id}`)
      .send({ addAddons: [{ productId: cat.products.kit }] })
      .expect(422);
    await api('patch', `subscriptions/${id}`).send({ startDate: '2026-02-01' }).expect(422);

    const res = await api('patch', `subscriptions/${id}`).send({
      quantities: [{ lineId: planLine.id, quantity: 4 }],
      addAddons: [{ productId: cat.products.support, quantity: 1 }],
    });
    expect(res.status).toBe(200);
    const lines = res.body.data.lines;
    const old = lines.find((l) => l.id === planLine.id);
    expect(old).toMatchObject({ quantity: 1, endsOn: '2026-02-28' });
    const next = lines.filter((l) => l.startsOn === '2026-03-01');
    expect(next.map((l) => [l.description, l.quantity, l.isPlanLine]).sort()).toEqual([
      ['CRM Suite', 4, true],
      ['Priority Support', 1, false],
    ]);
    // New plan line keeps the product taxes.
    expect(next.find((l) => l.isPlanLine).taxes).toHaveLength(1);

    const addon = next.find((l) => !l.isPlanLine);
    await api('patch', `subscriptions/${id}`)
      .send({ removeLineIds: [next.find((l) => l.isPlanLine).id] })
      .expect(422);
    const removed = await api('patch', `subscriptions/${id}`).send({ removeLineIds: [addon.id] });
    expect(removed.body.data.lines.find((l) => l.id === addon.id)).toBeUndefined();
  });

  it('renews by the original term and reopens an expired subscription', async () => {
    const user = { id: staff.id, role: 'staff' };
    const created = await subscriptions.create(
      {
        customerId: customer.id,
        planId: cat.plans.crmYearly.id,
        startDate: '2025-01-01',
        expiryDate: '2025-12-31',
      },
      user,
    );
    for (const to of ['quotation', 'confirmed', 'active']) {
      await subscriptions.transition(created.id, { to }, user, '2025-01-01');
    }
    await query(
      `update subscriptions set status = 'closed', close_reason = 'expired', closed_at = '2026-01-01',
              periods_billed = 1, next_invoice_date = null where id = $1`,
      [created.id],
    );
    const res = await api('post', `subscriptions/${created.id}/renew`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'active',
      expiryDate: '2026-12-31',
      nextInvoiceDate: '2026-01-01',
      closeReason: null,
    });

    const monthly = await api('post', 'subscriptions').send({
      customerId: customer.id,
      planId: cat.plans.hrWeekly.id,
      expiryDate: '2099-01-01',
    });
    const r = await api('post', `subscriptions/${monthly.body.data.id}/renew`);
    expect(r.body.error.details.rule).toBe('PLAN_NOT_RENEWABLE');
  });

  it('lists with filters, search and statusCounts in one call', async () => {
    for (let i = 0; i < 3; i += 1) {
      await api('post', 'subscriptions').send({ customerId: customer.id, planId: cat.plans.crmMonthly.id });
    }
    const other = await makeCustomer('Zenith Ltd');
    const z = await api('post', 'subscriptions').send({
      customerId: other.id,
      planId: cat.plans.crmMonthly.id,
    });
    await api('post', `subscriptions/${z.body.data.id}/transition`).send({ to: 'closed' }).expect(200);

    const all = await api('get', 'subscriptions?pageSize=2&sort=-createdAt');
    expect(all.status).toBe(200);
    expect(all.body.meta).toMatchObject({ total: 4, page: 1, pageSize: 2 });
    expect(all.body.meta.statusCounts).toEqual({ draft: 3, closed: 1 });
    expect(all.body.data).toHaveLength(2);
    expect(all.body.data[0]).toHaveProperty('recurringAmount', '1000.00');

    const drafts = await api('get', 'subscriptions?status=draft');
    expect(drafts.body.meta.total).toBe(3);
    expect(drafts.body.meta.statusCounts).toEqual({ draft: 3, closed: 1 });

    const search = await api('get', 'subscriptions?search=zenith');
    expect(search.body.data.map((s) => s.customerName)).toEqual(['Zenith Ltd']);
  });
});
