import { D } from '../lib/money.js';
import { addDays, addMonths } from '../lib/dates.js';

// Start of period n (0-based), always computed from the anchor so month ends never drift:
// anchor 31 Jan, monthly → 31 Jan, 28/29 Feb, 31 Mar, 30 Apr …
export function periodStart(anchor, billingPeriod, intervalCount, n) {
  const steps = n * intervalCount;
  switch (billingPeriod) {
    case 'daily':
      return addDays(anchor, steps);
    case 'weekly':
      return addDays(anchor, steps * 7);
    case 'monthly':
      return addMonths(anchor, steps);
    case 'yearly':
      return addMonths(anchor, steps * 12);
    default:
      throw new Error(`Unknown billing period ${billingPeriod}`);
  }
}

// Period end = next period start − 1 day.
export function periodEnd(anchor, billingPeriod, intervalCount, n) {
  return addDays(periodStart(anchor, billingPeriod, intervalCount, n + 1), -1);
}

export function period(anchor, billingPeriod, intervalCount, n) {
  return {
    start: periodStart(anchor, billingPeriod, intervalCount, n),
    end: periodEnd(anchor, billingPeriod, intervalCount, n),
  };
}

const PER_MONTH = { daily: new D(365).div(12), weekly: new D(52).div(12), monthly: new D(1), yearly: new D(1).div(12) };

// How many times a month one billing period occurs: yearly 1/12, weekly 52/12, daily 365/12,
// each divided by the interval.
export function monthlyFactor(billingPeriod, intervalCount = 1) {
  return PER_MONTH[billingPeriod].div(intervalCount);
}
