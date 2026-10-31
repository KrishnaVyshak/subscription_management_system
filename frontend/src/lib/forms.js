// Small helpers for turning form values into API payloads.

/** Empty strings from inputs → null for optional API fields. */
export function nullIfEmpty(v) {
  return v === '' || v === undefined ? null : v;
}

/** Money as typed ("1,000", "₹1000.5") → "1000" / "1000.5"; the API takes up to 2 decimals. */
export function moneyInput(v) {
  return String(v ?? '').replace(/[,\s₹]/g, '');
}

/** Drops keys whose value is undefined (PATCH bodies send only what changed). */
export function compact(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}
