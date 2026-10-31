import { describe, expect, it } from 'vitest';
import { discountState, isEligible, pickDiscounts, pickedIds } from '../../domain/discounts.js';

const day = '2026-06-15';
const d = (over = {}) => ({
  id: 'd1',
  is_active: true,
  type: 'percent',
  value: '10',
  scope: 'product',
  start_date: null,
  end_date: null,
  usage_limit: null,
  usage_count: 0,
  min_quantity: null,
  min_amount: null,
  product_ids: ['crm'],
  ...over,
});
const line = (over = {}) => ({ id: 'l1', product_id: 'crm', quantity: 10, unit_price: '1000', ...over });

describe('discount eligibility', () => {
  it('needs active, inside the window and under the limit', () => {
    expect(isEligible(d(), day)).toBe(true);
    expect(isEligible(d({ is_active: false }), day)).toBe(false);
    expect(isEligible(d({ start_date: '2026-06-16' }), day)).toBe(false);
    expect(isEligible(d({ start_date: day, end_date: day }), day)).toBe(true);
    expect(isEligible(d({ end_date: '2026-06-14' }), day)).toBe(false);
    expect(isEligible(d({ usage_limit: 2, usage_count: 1 }), day)).toBe(true);
    expect(isEligible(d({ usage_limit: 2, usage_count: 2 }), day)).toBe(false);
  });

  it('reports a state', () => {
    expect(discountState(d(), day)).toBe('active');
    expect(discountState(d({ start_date: '2026-07-01' }), day)).toBe('scheduled');
    expect(discountState(d({ end_date: '2026-01-01' }), day)).toBe('expired');
    expect(discountState(d({ usage_limit: 1, usage_count: 1 }), day)).toBe('exhausted');
    expect(discountState(d({ is_active: false }), day)).toBe('inactive');
  });
});

describe('pickDiscounts', () => {
  it('product scope applies to lines with that product, checking min qty and amount per line', () => {
    const pick = (l, disc = d({ min_quantity: 10 })) =>
      pickDiscounts({ productDiscounts: [disc], lines: [l], invoiceDate: day }).lineDiscounts.get('l1');
    expect(pick(line())?.id).toBe('d1');
    expect(pick(line({ quantity: 9 }))).toBeUndefined();
    expect(pick(line({ product_id: 'hr' }))).toBeUndefined();
    expect(pick(line({ quantity: 1 }), d({ min_amount: '1000.01' }))).toBeUndefined();
    expect(pick(line({ quantity: 1 }), d({ min_amount: '1000.00' }))?.id).toBe('d1');
  });

  it('largest per line wins, no stacking', () => {
    const tenPct = d({ id: 'a' });
    const fixed500 = d({ id: 'b', type: 'fixed', value: '500' });
    const fixed2000 = d({ id: 'c', type: 'fixed', value: '2000' });
    const { lineDiscounts } = pickDiscounts({
      productDiscounts: [tenPct, fixed500, fixed2000],
      lines: [line(), line({ id: 'l2', quantity: 1 })],
      invoiceDate: day,
    });
    expect(lineDiscounts.get('l1').id).toBe('c'); // 2000 > 1000 (10% of 10000) > 500
    expect(lineDiscounts.get('l2').id).toBe('c'); // capped at 1000, still ties-break over 'a'… largest
  });

  it('subscription scope only when attached, one per invoice, checked on totals', () => {
    const s500 = d({ id: 's1', scope: 'subscription', type: 'fixed', value: '500', product_ids: [] });
    const s10 = d({ id: 's2', scope: 'subscription', value: '10', product_ids: [], min_amount: '5000' });
    const lines = [line({ quantity: 3 })]; // 3000
    expect(pickDiscounts({ lines, invoiceDate: day }).invoiceDiscount).toBeNull();
    expect(pickDiscounts({ subscriptionDiscounts: [s500, s10], lines, invoiceDate: day }).invoiceDiscount.id).toBe('s1');
    const big = [line({ quantity: 10 })]; // 10000 → 10% = 1000 beats 500
    const picked = pickDiscounts({ subscriptionDiscounts: [s500, s10], lines: big, invoiceDate: day });
    expect(picked.invoiceDiscount.id).toBe('s2');
    expect(pickedIds(picked)).toEqual(['s2']);
  });

  it('respects the usage limit, the window and the exclude set', () => {
    const lim = d({ usage_limit: 2, usage_count: 2 });
    expect(pickDiscounts({ productDiscounts: [lim], lines: [line()], invoiceDate: day }).lineDiscounts.size).toBe(0);
    const late = d({ end_date: '2026-06-01' });
    expect(pickDiscounts({ productDiscounts: [late], lines: [line()], invoiceDate: day }).lineDiscounts.size).toBe(0);
    const ok = d();
    expect(
      pickDiscounts({ productDiscounts: [ok], lines: [line()], invoiceDate: day, exclude: new Set(['d1']) })
        .lineDiscounts.size,
    ).toBe(0);
  });

  it('counts a discount used on several lines once', () => {
    const picked = pickDiscounts({
      productDiscounts: [d()],
      lines: [line(), line({ id: 'l2' })],
      invoiceDate: day,
    });
    expect(picked.lineDiscounts.size).toBe(2);
    expect(pickedIds(picked)).toEqual(['d1']);
  });
});
