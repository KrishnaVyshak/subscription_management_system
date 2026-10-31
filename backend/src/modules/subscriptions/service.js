import { query, withTransaction } from '../../config/db.js';
import { mrr, isLineActiveOn } from '../../domain/mrr.js';
import { periodStart } from '../../domain/periods.js';
import { allowedActions, canRenew, checkTransition } from '../../domain/stateMachine.js';
import { updateRow } from '../../lib/crud.js';
import { addDays, diffDays, todayIST } from '../../lib/dates.js';
import { BusinessRuleError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { fmt } from '../../lib/money.js';
import { resolveLines } from '../catalog/lineResolver.js';
import { getTemplate } from '../templates/service.js';
import * as repo from './repo.js';
import { previewNextInvoice, recentInvoices } from './preview.js';

const db = { query };
const rule = (code, message) => new BusinessRuleError(message, { rule: code });

// ---------- reads ----------

export async function list(filters, today = todayIST()) {
  const { rows, total, status_counts: statusCounts } = await repo.list(db, filters, today);
  return { rows, total, statusCounts };
}

// Lines that are in effect now or start later (not ended before `day`).
const openLines = (lines, day) => lines.filter((l) => !l.ends_on || l.ends_on >= day);

export async function getDetail(id, { role = 'admin', customerId } = {}, today = todayIST()) {
  const sub = await repo.findSubscription(db, id);
  if (!sub || (customerId && sub.customer_id !== customerId)) {
    throw new NotFoundError('Subscription not found');
  }
  const [plan, lines, history, invoices] = await Promise.all([
    repo.findPlan(db, sub.plan_id),
    repo.linesFor(db, id),
    repo.history(db, id),
    recentInvoices(db, id),
  ]);
  const currentDay = sub.status === 'active' || sub.status === 'paused' ? today : sub.start_date;
  const current = lines.filter((l) => isLineActiveOn(l, currentDay));
  const totals = await previewNextInvoice(db, sub, lines, today);

  return {
    ...sub,
    plan: {
      id: plan.id,
      name: plan.name,
      price: plan.price,
      min_quantity: plan.min_quantity,
      auto_close: plan.auto_close,
      closable: plan.closable,
      pausable: plan.pausable,
      renewable: plan.renewable,
    },
    lines: lines.map((l) => ({ ...l, is_current: isLineActiveOn(l, currentDay) })),
    mrr: fmt(mrr(current, sub.billing_period, sub.interval_count)),
    totals,
    history,
    recent_invoices: invoices,
    discounts: await attachedDiscounts(db, id),
    allowed_actions: allowedActions({
      sub,
      plan,
      lines: openLines(lines, currentDay),
      today,
      isAdmin: role === 'admin',
    }),
  };
}

async function attachedDiscounts(client, subscriptionId) {
  const { rows } = await client.query(
    `select to_regclass('public.subscription_discounts') is not null as present`,
  );
  if (!rows[0].present) return [];
  const res = await client.query(
    `select d.id, d.name, d.type, d.value::text as value, d.scope, d.end_date, d.is_active
       from subscription_discounts sd join discounts d on d.id = sd.discount_id
      where sd.subscription_id = $1 order by d.name`,
    [subscriptionId],
  );
  return res.rows;
}

// ---------- create ----------

async function loadActivePlan(client, planId) {
  const plan = await repo.findPlan(client, planId);
  if (!plan) throw new ValidationError('Unknown plan', { planId });
  if (!plan.is_active) throw rule('PLAN_INACTIVE', 'This plan is no longer offered');
  return plan;
}

// Puts the plan line first; adds one (plan product, min quantity, plan price) when missing.
async function withPlanLine(client, resolved, plan) {
  const index = resolved.findIndex((l) => l.product_id === plan.product_id);
  if (index >= 0) {
    const [planLine] = resolved.splice(index, 1);
    return [planLine, ...resolved];
  }
  const [planLine] = await resolveLines(
    client,
    [{ productId: plan.product_id, quantity: plan.min_quantity }],
    plan,
  );
  return [planLine, ...resolved];
}

async function insertLines(client, subscriptionId, lines) {
  for (const [i, line] of lines.entries()) {
    await repo.insertLine(client, subscriptionId, line, { isPlanLine: i === 0, sortOrder: i });
  }
}

export async function create(body, user, today = todayIST()) {
  const id = await withTransaction(async (client) => {
    const { rows: customers } = await client.query(
      'select id, is_active from customers where id = $1',
      [body.customerId],
    );
    if (!customers[0]) throw new ValidationError('Unknown customer', { customerId: body.customerId });
    if (!customers[0].is_active) throw rule('CUSTOMER_INACTIVE', 'This customer is deactivated');

    let planId = body.planId;
    let paymentTermId = body.paymentTermId ?? null;
    let quoteValidUntil = body.quoteValidUntil ?? null;
    let lineInputs = [];

    if (body.templateId) {
      const template = await getTemplate(client, body.templateId);
      if (!template || !template.is_active) {
        throw new ValidationError('Unknown template', { templateId: body.templateId });
      }
      planId = template.plan_id;
      paymentTermId = body.paymentTermId ?? template.payment_term_id;
      quoteValidUntil = addDays(today, template.validity_days);
      lineInputs = template.lines.map((l) => ({
        productId: l.product_id,
        variantId: l.variant_id,
        quantity: l.quantity,
        unitPrice: l.unit_price,
        description: l.description,
      }));
    }

    const plan = await loadActivePlan(client, planId);
    const lines = await withPlanLine(client, await resolveLines(client, lineInputs, plan), plan);

    const { rows } = await client.query(
      `insert into subscriptions
         (number, customer_id, plan_id, template_id, status, billing_period, interval_count,
          start_date, expiry_date, quote_valid_until, payment_term_id, salesperson_id, notes, created_by)
       values (next_doc_number('SUB', $1), $2, $3, $4, 'draft', $5, $6, $1, $7, $8, $9, $10, $11, $12)
       returning id`,
      [
        body.startDate ?? today,
        body.customerId,
        plan.id,
        body.templateId ?? null,
        plan.billing_period,
        plan.interval_count,
        body.expiryDate ?? null,
        quoteValidUntil,
        paymentTermId,
        body.salespersonId ?? null,
        body.notes ?? null,
        user.id,
      ],
    );
    const subId = rows[0].id;
    await insertLines(client, subId, lines);
    await repo.logStatus(client, subId, null, 'draft', user.id, 'Created');
    return subId;
  });
  return getDetail(id, user, today);
}

// ---------- edit ----------

const HEADER_FIELDS = [
  'customerId',
  'planId',
  'startDate',
  'expiryDate',
  'quoteValidUntil',
  'paymentTermId',
  'salespersonId',
  'notes',
];
const RUNNING_FIELDS = ['quantities', 'addAddons', 'removeLineIds', 'notes'];

export async function update(id, body, user, today = todayIST()) {
  await withTransaction(async (client) => {
    const sub = await repo.lockSubscription(client, id);
    if (user.customerId && sub.customer_id !== user.customerId) {
      throw new NotFoundError('Subscription not found');
    }
    if (sub.status === 'draft' || sub.status === 'quotation') {
      await editDraft(client, sub, body);
    } else if (sub.status === 'active' || sub.status === 'paused') {
      await editRunning(client, sub, body, today);
    } else {
      throw rule('EDIT_NOT_ALLOWED', `A ${sub.status} subscription cannot be edited`);
    }
  });
  return getDetail(id, user, today);
}

async function editDraft(client, sub, body) {
  const running = ['quantities', 'addAddons', 'removeLineIds'].filter((k) => body[k] !== undefined);
  if (running.length) {
    throw new ValidationError('Use `lines` to edit a draft or quotation', { fields: running });
  }
  const fields = Object.fromEntries(
    HEADER_FIELDS.filter((k) => body[k] !== undefined).map((k) => [k, body[k]]),
  );
  let plan = await repo.findPlan(client, sub.plan_id);
  const planChanged = body.planId && body.planId !== sub.plan_id;
  if (planChanged) {
    plan = await loadActivePlan(client, body.planId);
    fields.billingPeriod = plan.billing_period;
    fields.intervalCount = plan.interval_count;
  }
  if (body.customerId) {
    const { rows } = await client.query('select is_active from customers where id = $1', [body.customerId]);
    if (!rows[0]) throw new ValidationError('Unknown customer');
    if (!rows[0].is_active) throw rule('CUSTOMER_INACTIVE', 'This customer is deactivated');
  }
  await updateRow(client, 'subscriptions', sub.id, fields);

  if (body.lines) {
    const lines = await withPlanLine(client, await resolveLines(client, body.lines, plan), plan);
    await client.query('delete from subscription_lines where subscription_id = $1', [sub.id]);
    await insertLines(client, sub.id, lines);
  } else if (planChanged) {
    await client.query(
      'delete from subscription_lines where subscription_id = $1 and is_plan_line',
      [sub.id],
    );
    const [planLine] = await withPlanLine(client, [], plan);
    await repo.insertLine(client, sub.id, planLine, { isPlanLine: true, sortOrder: 0 });
  }
}

// Changes take effect at the start of the next unbilled period.
async function editRunning(client, sub, body, today) {
  const blocked = Object.keys(body).filter((k) => body[k] !== undefined && !RUNNING_FIELDS.includes(k));
  if (blocked.length) {
    throw new BusinessRuleError(
      'A running subscription only accepts quantity changes and add-ons, effective next period',
      { rule: 'EDIT_NOT_ALLOWED', fields: blocked },
    );
  }
  if (body.notes !== undefined) await updateRow(client, 'subscriptions', sub.id, { notes: body.notes });

  const effective = sub.next_invoice_date ?? today;
  const plan = await repo.findPlan(client, sub.plan_id);
  const lines = await repo.linesFor(client, sub.id);
  const open = (lineId) => {
    const line = lines.find((l) => l.id === lineId);
    if (!line || (line.ends_on && line.ends_on < effective)) {
      throw new ValidationError('Unknown or ended line', { lineId });
    }
    return line;
  };
  const endBefore = (line) =>
    client.query('update subscription_lines set ends_on = $2 where id = $1', [
      line.id,
      addDays(effective, -1),
    ]);
  const startsLater = (line) => line.starts_on && line.starts_on >= effective;
  let sortOrder = Math.max(0, ...lines.map((l) => l.sort_order)) + 1;

  for (const { lineId, quantity } of body.quantities ?? []) {
    const line = open(lineId);
    if (line.quantity === quantity) continue;
    if (startsLater(line)) {
      await client.query('update subscription_lines set quantity = $2 where id = $1', [line.id, quantity]);
    } else {
      await endBefore(line);
      const copy = await repo.insertLine(
        client,
        sub.id,
        { ...line, quantity, tax_ids: [] },
        { isPlanLine: line.is_plan_line, startsOn: effective, sortOrder: line.sort_order },
      );
      await repo.copyLineTaxes(client, line.id, copy.id);
    }
  }

  if (body.addAddons?.length) {
    const resolved = await resolveLines(client, body.addAddons, plan);
    for (const line of resolved) {
      if (line.product_type !== 'addon') {
        throw rule('ADDON_ONLY', `${line.description} is not an add-on`);
      }
      await repo.insertLine(client, sub.id, line, { startsOn: effective, sortOrder: sortOrder++ });
    }
  }

  for (const lineId of body.removeLineIds ?? []) {
    const line = open(lineId);
    if (line.is_plan_line) throw rule('PLAN_LINE_REQUIRED', 'The plan line cannot be removed');
    if (line.product_type !== 'addon') throw rule('ADDON_ONLY', 'Only add-ons can be removed');
    if (startsLater(line)) {
      await client.query('delete from subscription_lines where id = $1', [line.id]);
    } else {
      await endBefore(line);
    }
  }

  const after = (await repo.linesFor(client, sub.id)).filter((l) => isLineActiveOn(l, effective));
  const planLine = after.find((l) => l.is_plan_line);
  if (planLine && planLine.quantity < plan.min_quantity) {
    throw rule('MIN_QUANTITY', `The plan needs a quantity of at least ${plan.min_quantity}`);
  }
}

// ---------- status transitions ----------

/**
 * Moves a locked subscription row to `to` inside `client`'s transaction. Shared by the API,
 * the portal and the daily jobs (changedBy null = system).
 */
export async function applyTransition(client, sub, { to, note, reason, force = false }, { changedBy = null, isAdmin = false, today = todayIST() } = {}) {
  const plan = await repo.findPlan(client, sub.plan_id);
  const lines = openLines(await repo.linesFor(client, sub.id), sub.next_invoice_date ?? today);
  const check = checkTransition({ sub, plan, lines, to, today, force, isAdmin });
  if (!check.ok) throw rule(check.rule, check.message);

  const fields = { status: to };
  if (to === 'active' && sub.status === 'confirmed') {
    Object.assign(fields, {
      billingAnchorDate: sub.start_date,
      nextInvoiceDate: sub.start_date,
      periodsBilled: 0,
    });
  } else if (to === 'active' && sub.status === 'paused') {
    // Resume: shift the anchor by the paused days, then recompute the next invoice date.
    const pausedDays = Math.max(0, diffDays(sub.paused_at ?? today, today));
    const anchor = addDays(sub.billing_anchor_date, pausedDays);
    Object.assign(fields, {
      billingAnchorDate: anchor,
      nextInvoiceDate: periodStart(anchor, sub.billing_period, sub.interval_count, sub.periods_billed),
      pausedAt: null,
    });
  } else if (to === 'paused') {
    fields.pausedAt = today;
  } else if (to === 'closed') {
    Object.assign(fields, {
      closedAt: today,
      closeReason: reason ?? 'manual',
      nextInvoiceDate: null,
      pausedAt: null,
    });
  }

  const updated = await updateRow(client, 'subscriptions', sub.id, fields);
  await repo.logStatus(client, sub.id, sub.status, to, changedBy, note ?? reason);
  return updated;
}

export async function transition(id, input, user, today = todayIST()) {
  await withTransaction(async (client) => {
    const sub = await repo.lockSubscription(client, id);
    if (user.customerId && sub.customer_id !== user.customerId) {
      throw new NotFoundError('Subscription not found');
    }
    await applyTransition(client, sub, input, {
      changedBy: user.id,
      isAdmin: user.role === 'admin',
      today,
    });
  });
  return getDetail(id, user, today);
}

// Extends expiry by the original term (start → first expiry, inclusive). Reopens a
// subscription that was closed as `expired`; billing then continues from where it stopped.
export async function renew(id, user, today = todayIST()) {
  await withTransaction(async (client) => {
    const sub = await repo.lockSubscription(client, id);
    if (user.customerId && sub.customer_id !== user.customerId) {
      throw new NotFoundError('Subscription not found');
    }
    const plan = await repo.findPlan(client, sub.plan_id);
    const check = canRenew({ sub, plan });
    if (!check.ok) throw rule(check.rule, check.message);

    const termDays = sub.term_days ?? diffDays(sub.start_date, sub.expiry_date) + 1;
    const expiryDate = addDays(sub.expiry_date, termDays);
    const fields = { expiryDate, termDays };
    let to = sub.status;
    if (sub.status === 'closed') {
      to = 'active';
      Object.assign(fields, {
        status: 'active',
        closedAt: null,
        closeReason: null,
        nextInvoiceDate: periodStart(
          sub.billing_anchor_date ?? sub.start_date,
          sub.billing_period,
          sub.interval_count,
          sub.periods_billed,
        ),
        billingAnchorDate: sub.billing_anchor_date ?? sub.start_date,
      });
    }
    await updateRow(client, 'subscriptions', sub.id, fields);
    await repo.logStatus(client, sub.id, sub.status, to, user.id, `Renewed until ${expiryDate}`);
  });
  return getDetail(id, user, today);
}
