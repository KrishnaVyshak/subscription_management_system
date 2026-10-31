import { D, round2 } from '../lib/money.js';
import { discountAmount } from './invoiceCalc.js';

// Eligible on `day`: active, inside its window, and under its usage limit.
export function isEligible(discount, day) {
  return (
    discount.is_active &&
    (!discount.start_date || discount.start_date <= day) &&
    (!discount.end_date || day <= discount.end_date) &&
    (discount.usage_limit == null || discount.usage_count < discount.usage_limit)
  );
}

// scheduled | active | expired | exhausted | inactive (switched off by hand)
export function discountState(discount, today) {
  if (discount.usage_limit != null && discount.usage_count >= discount.usage_limit) return 'exhausted';
  if (discount.end_date && discount.end_date < today) return 'expired';
  if (!discount.is_active) return 'inactive';
  if (discount.start_date && discount.start_date > today) return 'scheduled';
  return 'active';
}

// Largest amount wins; ties go to the earlier discount id so the choice is stable.
function largest(candidates) {
  let best = null;
  for (const c of candidates) {
    if (!c.amount.gt(0)) continue;
    if (!best || c.amount.gt(best.amount) || (c.amount.eq(best.amount) && c.discount.id < best.discount.id)) {
      best = c;
    }
  }
  return best?.discount ?? null;
}

/**
 * No stacking: at most one product discount per line (the largest), plus at most one
 * subscription discount on the invoice (the largest), both never more than their base.
 *
 * productDiscounts: product-scope discounts with `product_ids`.
 * subscriptionDiscounts: subscription-scope discounts attached to this subscription.
 * lines: [{ id, product_id, quantity, unit_price }]
 * exclude: discount ids that could not be claimed.
 */
export function pickDiscounts({ productDiscounts = [], subscriptionDiscounts = [], lines, invoiceDate, exclude = new Set() }) {
  const usable = (d) => !exclude.has(d.id) && isEligible(d, invoiceDate);
  const lineDiscounts = new Map();
  let base = new D(0);
  let quantity = 0;

  for (const line of lines) {
    const subtotal = round2(new D(line.unit_price).times(line.quantity));
    const candidates = productDiscounts
      .filter((d) => usable(d) && d.product_ids.includes(line.product_id))
      .filter((d) => d.min_quantity == null || line.quantity >= d.min_quantity)
      .filter((d) => d.min_amount == null || subtotal.gte(d.min_amount))
      .map((d) => ({ discount: d, amount: discountAmount(d, subtotal) }));
    const best = largest(candidates);
    if (best) lineDiscounts.set(line.id, best);
    base = base.plus(subtotal.minus(discountAmount(best, subtotal)));
    quantity += line.quantity;
  }

  const invoiceCandidates = subscriptionDiscounts
    .filter(usable)
    .filter((d) => d.min_quantity == null || quantity >= d.min_quantity)
    .filter((d) => d.min_amount == null || base.gte(d.min_amount))
    .map((d) => ({ discount: d, amount: discountAmount(d, base) }));

  return { lineDiscounts, invoiceDiscount: largest(invoiceCandidates) };
}

// Distinct discount ids used by a pick.
export function pickedIds(picked) {
  const ids = new Set([...picked.lineDiscounts.values()].map((d) => d.id));
  if (picked.invoiceDiscount) ids.add(picked.invoiceDiscount.id);
  return [...ids];
}
