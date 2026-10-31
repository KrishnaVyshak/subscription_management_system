import { describe, expect, it } from 'vitest';
import { allowedActions, canRenew, checkTransition, TRANSITIONS } from '../../domain/stateMachine.js';

const today = '2026-06-15';
const plan = {
  min_quantity: 2,
  pausable: true,
  closable: true,
  renewable: true,
  is_active: true,
  available_from: null,
  available_to: null,
};
const lines = [{ is_plan_line: true, quantity: 2 }];
const sub = (status, extra = {}) => ({ status, quote_valid_until: null, expiry_date: null, ...extra });
const check = (s, to, overrides = {}) =>
  checkTransition({ sub: s, plan, lines, to, today, ...overrides });

describe('state machine', () => {
  const statuses = ['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'];

  it.each(statuses.flatMap((from) => statuses.map((to) => [from, to])))('%s → %s', (from, to) => {
    const result = check(sub(from), to);
    if (TRANSITIONS[from].includes(to)) expect(result).toEqual({ ok: true });
    else expect(result).toMatchObject({ ok: false, rule: 'INVALID_TRANSITION' });
  });

  it('→ quotation needs lines and the plan minimum quantity', () => {
    expect(check(sub('draft'), 'quotation', { lines: [] }).rule).toBe('NO_LINES');
    expect(check(sub('draft'), 'quotation', { lines: [{ is_plan_line: false, quantity: 5 }] }).rule).toBe(
      'PLAN_LINE_REQUIRED',
    );
    expect(check(sub('draft'), 'quotation', { lines: [{ is_plan_line: true, quantity: 1 }] }).rule).toBe(
      'MIN_QUANTITY',
    );
  });

  it('→ confirmed rejects an expired quote and an unavailable plan', () => {
    expect(check(sub('quotation', { quote_valid_until: '2026-06-14' }), 'confirmed').rule).toBe(
      'QUOTE_EXPIRED',
    );
    expect(check(sub('quotation', { quote_valid_until: today }), 'confirmed').ok).toBe(true);
    expect(
      check(sub('quotation'), 'confirmed', { plan: { ...plan, available_to: '2026-06-01' } }).rule,
    ).toBe('PLAN_UNAVAILABLE');
    expect(check(sub('quotation'), 'confirmed', { plan: { ...plan, is_active: false } }).rule).toBe(
      'PLAN_UNAVAILABLE',
    );
  });

  it('→ paused needs a pausable plan', () => {
    expect(check(sub('active'), 'paused', { plan: { ...plan, pausable: false } }).rule).toBe(
      'PLAN_NOT_PAUSABLE',
    );
  });

  it('early close needs a closable plan unless an admin forces it', () => {
    const fixed = { ...plan, closable: false };
    expect(check(sub('active'), 'closed', { plan: fixed }).rule).toBe('PLAN_NOT_CLOSABLE');
    expect(check(sub('paused'), 'closed', { plan: fixed }).rule).toBe('PLAN_NOT_CLOSABLE');
    expect(check(sub('active'), 'closed', { plan: fixed, force: true }).rule).toBe('PLAN_NOT_CLOSABLE');
    expect(check(sub('active'), 'closed', { plan: fixed, force: true, isAdmin: true }).ok).toBe(true);
    // Not early: on or after the expiry date.
    expect(check(sub('active', { expiry_date: today }), 'closed', { plan: fixed }).ok).toBe(true);
    // Drafts can always be closed.
    expect(check(sub('draft'), 'closed', { plan: fixed }).ok).toBe(true);
  });

  it('renewal needs renewable, an expiry and a running or expired status', () => {
    expect(canRenew({ sub: sub('active'), plan }).rule).toBe('NO_EXPIRY');
    expect(canRenew({ sub: sub('active', { expiry_date: today }), plan: { ...plan, renewable: false } }).rule).toBe(
      'PLAN_NOT_RENEWABLE',
    );
    expect(canRenew({ sub: sub('active', { expiry_date: today }), plan }).ok).toBe(true);
    expect(canRenew({ sub: sub('closed', { expiry_date: today, close_reason: 'expired' }), plan }).ok).toBe(
      true,
    );
    expect(canRenew({ sub: sub('closed', { expiry_date: today, close_reason: 'manual' }), plan }).rule).toBe(
      'NOT_RENEWABLE_STATUS',
    );
  });

  it('lists allowed actions', () => {
    expect(allowedActions({ sub: sub('active'), plan, lines, today })).toEqual([
      'paused',
      'closed',
      'edit',
      'invoice',
    ]);
    expect(allowedActions({ sub: sub('draft'), plan, lines: [], today })).toEqual(['closed', 'edit']);
  });
});
