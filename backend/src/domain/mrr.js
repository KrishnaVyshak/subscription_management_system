import { D, round2 } from '../lib/money.js';
import { monthlyFactor } from './periods.js';

// MRR = Σ(qty × unit_price of current lines) × monthly factor. Pre-discount, pre-tax.
export function mrr(lines, billingPeriod, intervalCount = 1) {
  const perPeriod = lines.reduce((acc, l) => acc.plus(new D(l.unit_price).times(l.quantity)), new D(0));
  return round2(perPeriod.times(monthlyFactor(billingPeriod, intervalCount)));
}

// A line is current on `day` when it has started and not ended.
export function isLineActiveOn(line, day) {
  return (!line.starts_on || line.starts_on <= day) && (!line.ends_on || line.ends_on >= day);
}
