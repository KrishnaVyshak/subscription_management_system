import { query } from '../../config/db.js';
import { updateRow } from '../../lib/crud.js';
import { todayIST } from '../../lib/dates.js';
import { BusinessRuleError, NotFoundError } from '../../lib/errors.js';
import * as invoices from '../invoices/service.js';
import * as payments from '../payments/service.js';
import * as subscriptions from '../subscriptions/service.js';

// Everything here is scoped to req.user.customerId. Another customer's rows — and internal
// drafts — answer 404, never 403, so ids cannot be probed.
const VISIBLE_INVOICE_STATUSES = ['confirmed', 'paid', 'cancelled'];
const VISIBLE_SUB_STATUSES = ['quotation', 'confirmed', 'active', 'paused', 'closed'];

async function ownSubscription(user, id) {
  const { rows } = await query('select id, status, customer_id from subscriptions where id = $1', [id]);
  const sub = rows[0];
  if (!sub || sub.customer_id !== user.customerId || sub.status === 'draft') {
    throw new NotFoundError('Subscription not found');
  }
  return sub;
}

async function ownInvoice(user, id) {
  const { rows } = await query('select id, status, customer_id from invoices where id = $1', [id]);
  const inv = rows[0];
  if (!inv || inv.customer_id !== user.customerId || inv.status === 'draft') {
    throw new NotFoundError('Invoice not found');
  }
  return inv;
}

// Portal actions derived from the staff-side allowedActions (no admin force).
function portalActions(sub) {
  const a = new Set(sub.allowed_actions);
  const running = sub.status === 'active' || sub.status === 'paused';
  const actions = [];
  if (sub.status === 'active' && a.has('paused')) actions.push('pause');
  if (sub.status === 'paused' && a.has('active')) actions.push('resume');
  if (running && a.has('closed')) actions.push('cancel');
  if (a.has('renew')) actions.push('renew');
  if (running) actions.push('addons');
  return actions;
}

function presentSubscription(sub) {
  const { allowed_actions: _staffActions, created_by: _c, salesperson_id: _s, notes: _n, ...rest } = sub;
  return { ...rest, allowed_actions: portalActions(sub) };
}

export async function overview(user, today = todayIST()) {
  const { rows } = await query(
    `select c.id, c.name, c.email,
            (select count(*) from subscriptions s where s.customer_id = c.id and s.status = 'active')
              as active_subscriptions,
            (select count(*) from subscriptions s where s.customer_id = c.id and s.status = 'paused')
              as paused_subscriptions,
            (select min(s.next_invoice_date) from subscriptions s
              where s.customer_id = c.id and s.status = 'active') as next_invoice_date,
            (select coalesce(sum(v.amount_due), 0)::text from invoice_overview v
              where v.customer_id = c.id and v.status = 'confirmed') as outstanding_amount,
            (select count(*) from invoice_overview v where v.customer_id = c.id and v.is_overdue)
              as overdue_invoices,
            (select coalesce(sum(v.amount_due), 0)::text from invoice_overview v
              where v.customer_id = c.id and v.is_overdue) as overdue_amount
       from customers c where c.id = $1`,
    [user.customerId],
  );
  const recent = await invoices.list({
    customerId: user.customerId,
    status: VISIBLE_INVOICE_STATUSES,
    page: 1,
    pageSize: 5,
  });
  return { ...rows[0], today, recent_invoices: recent.rows };
}

// Narrows a requested status filter to what the portal may show; drafts never appear.
function visibleStatuses(requested, visible) {
  return requested?.length ? requested.filter((s) => visible.includes(s)) : visible;
}

const withoutDrafts = ({ draft: _d, ...counts } = {}) => counts;

export async function listSubscriptions(user, filters) {
  const status = visibleStatuses(filters.status, VISIBLE_SUB_STATUSES);
  if (!status.length) return { rows: [], total: 0, statusCounts: {} };
  const result = await subscriptions.list({ ...filters, customerId: user.customerId, status });
  return { ...result, statusCounts: withoutDrafts(result.statusCounts) };
}

export async function getSubscription(user, id) {
  await ownSubscription(user, id);
  return presentSubscription(await subscriptions.getDetail(id, user));
}

export async function pause(user, id, note) {
  const sub = await ownSubscription(user, id);
  if (sub.status !== 'active') throw rule('Only an active subscription can be paused');
  await subscriptions.transition(id, { to: 'paused', note }, user);
  return getSubscription(user, id);
}

export async function resume(user, id, note) {
  const sub = await ownSubscription(user, id);
  if (sub.status !== 'paused') throw rule('Only a paused subscription can be resumed');
  await subscriptions.transition(id, { to: 'active', note }, user);
  return getSubscription(user, id);
}

export async function cancel(user, id, note) {
  const sub = await ownSubscription(user, id);
  if (sub.status !== 'active' && sub.status !== 'paused') {
    throw rule('Only an active or paused subscription can be cancelled here');
  }
  await subscriptions.transition(id, { to: 'closed', reason: 'customer_cancelled', note }, user);
  return getSubscription(user, id);
}

export async function renew(user, id) {
  await ownSubscription(user, id);
  await subscriptions.renew(id, user);
  return getSubscription(user, id);
}

// Add or remove add-ons; takes effect next period (same rules as staff edits).
export async function addons(user, id, { add = [], remove = [] }) {
  await ownSubscription(user, id);
  await subscriptions.update(id, { addAddons: add, removeLineIds: remove }, user);
  return getSubscription(user, id);
}

export async function listInvoices(user, filters) {
  const status = visibleStatuses(filters.status, VISIBLE_INVOICE_STATUSES);
  if (!status.length) return { rows: [], total: 0, statusCounts: {}, totals: null };
  const result = await invoices.list({ ...filters, customerId: user.customerId, status });
  return { ...result, statusCounts: withoutDrafts(result.statusCounts) };
}

export async function getInvoice(user, id) {
  await ownInvoice(user, id);
  const detail = await invoices.getDetail(id, user);
  const { company_snapshot: _c, billing_run_id: _r, created_by: _b, ...rest } = detail;
  return rest;
}

export async function invoicePdf(user, id) {
  await ownInvoice(user, id);
  return invoices.pdf(id, user);
}

export function listPayments(user, filters) {
  return payments.list(filters, { customerId: user.customerId });
}

export async function getProfile(user) {
  const { rows } = await query(
    `select c.id as customer_id, c.name, c.email, c.phone, c.billing_address, c.gstin,
            p.full_name, p.email as login_email
       from customers c join profiles p on p.id = c.profile_id where c.id = $1`,
    [user.customerId],
  );
  return rows[0];
}

export async function updateProfile(user, { fullName, ...customer }) {
  if (fullName !== undefined) await updateRow({ query }, 'profiles', user.id, { fullName });
  await updateRow({ query }, 'customers', user.customerId, customer);
  return getProfile(user);
}

function rule(message) {
  return new BusinessRuleError(message, { rule: 'INVALID_TRANSITION' });
}
