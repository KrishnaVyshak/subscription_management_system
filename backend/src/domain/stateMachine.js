import { SUBSCRIPTION_TRANSITIONS } from '@brightloop/shared';

export const TRANSITIONS = SUBSCRIPTION_TRANSITIONS;

export function isPlanAvailable(plan, day) {
  return (
    plan.is_active &&
    (!plan.available_from || plan.available_from <= day) &&
    (!plan.available_to || plan.available_to >= day)
  );
}

const fail = (rule, message) => ({ ok: false, rule, message });
const OK = { ok: true };

/**
 * Checks one transition. Pure: everything it needs is passed in.
 * sub: { status, quote_valid_until, expiry_date }
 * plan: { min_quantity, pausable, closable, is_active, available_from, available_to }
 * lines: current lines ({ is_plan_line, quantity })
 * Returns { ok: true } or { ok: false, rule, message }.
 */
export function checkTransition({ sub, plan, lines = [], to, today, force = false, isAdmin = false }) {
  const allowed = TRANSITIONS[sub.status] ?? [];
  if (!allowed.includes(to)) {
    return fail('INVALID_TRANSITION', `Cannot move a ${sub.status} subscription to ${to}`);
  }

  if (to === 'quotation') {
    if (lines.length === 0) return fail('NO_LINES', 'Add at least one line first');
    const planLine = lines.find((l) => l.is_plan_line);
    if (!planLine) return fail('PLAN_LINE_REQUIRED', 'The plan line is missing');
    if (planLine.quantity < plan.min_quantity) {
      return fail('MIN_QUANTITY', `The plan needs a quantity of at least ${plan.min_quantity}`);
    }
  }

  if (to === 'confirmed') {
    if (sub.quote_valid_until && sub.quote_valid_until < today) {
      return fail('QUOTE_EXPIRED', 'The quotation has expired');
    }
    if (!isPlanAvailable(plan, today)) {
      return fail('PLAN_UNAVAILABLE', 'The plan is not available');
    }
  }

  if (to === 'paused' && !plan.pausable) {
    return fail('PLAN_NOT_PAUSABLE', 'This plan cannot be paused');
  }

  // Early close of a running subscription needs a closable plan, unless an admin forces it.
  if (to === 'closed' && (sub.status === 'active' || sub.status === 'paused')) {
    const early = !sub.expiry_date || today < sub.expiry_date;
    if (early && !plan.closable && !(force && isAdmin)) {
      return fail('PLAN_NOT_CLOSABLE', 'This plan cannot be closed before it expires');
    }
  }

  return OK;
}

/**
 * Actions the UI can offer: every passing transition target, plus 'edit', 'renew', 'invoice'.
 */
export function allowedActions({ sub, plan, lines, today, isAdmin = false }) {
  const actions = [];
  for (const to of TRANSITIONS[sub.status] ?? []) {
    if (checkTransition({ sub, plan, lines, to, today, force: isAdmin, isAdmin }).ok) {
      actions.push(to);
    }
  }
  if (['draft', 'quotation', 'active', 'paused'].includes(sub.status)) actions.push('edit');
  if (canRenew({ sub, plan }).ok) actions.push('renew');
  if (sub.status === 'active') actions.push('invoice');
  return actions;
}

export function canRenew({ sub, plan }) {
  if (!plan.renewable) return fail('PLAN_NOT_RENEWABLE', 'This plan is not renewable');
  if (!sub.expiry_date) return fail('NO_EXPIRY', 'Only subscriptions with an expiry date can be renewed');
  const running = ['active', 'paused', 'confirmed'].includes(sub.status);
  const expired = sub.status === 'closed' && sub.close_reason === 'expired';
  if (!running && !expired) {
    return fail('NOT_RENEWABLE_STATUS', `A ${sub.status} subscription cannot be renewed`);
  }
  return OK;
}
