import Decimal from 'decimal.js';

// All money math goes through D: half-up rounding, never floats.
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export const ZERO = new D(0);

export function round2(x) {
  return new D(x).toDecimalPlaces(2, D.ROUND_HALF_UP);
}

// "1180.00"
export function fmt(x) {
  return new D(x ?? 0).toFixed(2, D.ROUND_HALF_UP);
}

export function sum(values) {
  return values.reduce((acc, v) => acc.plus(v), new D(0));
}
