// Client-side *preview* of line and invoice totals, mirroring backend/src/domain/invoiceCalc.js
// and tax.js. Works in integer paise to avoid float drift. The server's totals are authoritative;
// screens label these figures as a preview.

const toPaise = (v) => Math.round(Number(v || 0) * 100);
const fromPaise = (p) => (p / 100).toFixed(2);

/** Default unit price: the plan's price for its own product, else the sales price, plus extras. */
export function defaultUnitPrice({ product, variant, plan }) {
  if (!product) return '';
  const base = plan && plan.productId === product.id ? plan.price : product.salesPrice;
  // variant.price = salesPrice + Σ extras, so the extras are the difference.
  const extras = variant ? toPaise(variant.price) - toPaise(product.salesPrice) : 0;
  return fromPaise(toPaise(base) + extras);
}

function discountPaise(discount, base) {
  if (!discount || base <= 0) return 0;
  const raw =
    discount.type === 'percent' ? Math.round((base * Number(discount.value)) / 100) : toPaise(discount.value);
  return Math.min(Math.max(raw, 0), base);
}

/** Taxes on a line amount (paise), as in domain/tax.js. */
export function lineTaxes(amount, quantity, taxes = []) {
  const fixed = (t) => Math.round(Number(t.rate) * 100 * quantity);
  const includedFixed = taxes
    .filter((t) => t.priceIncluded && t.type === 'fixed')
    .reduce((a, t) => a + fixed(t), 0);
  const includedRate = taxes
    .filter((t) => t.priceIncluded && t.type === 'percent')
    .reduce((a, t) => a + Number(t.rate) / 100, 0);
  const net = Math.max(amount - includedFixed, 0) / (1 + includedRate);

  let includedTotal = 0;
  const amounts = taxes.map((t) => {
    if (!t.priceIncluded) return null;
    const a = t.type === 'fixed' ? fixed(t) : Math.round((net * Number(t.rate)) / 100);
    includedTotal += a;
    return a;
  });
  const taxable = amount - includedTotal;
  taxes.forEach((t, i) => {
    if (t.priceIncluded) return;
    amounts[i] = t.type === 'fixed' ? fixed(t) : Math.round((taxable * Number(t.rate)) / 100);
  });
  const taxTotal = amounts.reduce((a, x) => a + x, 0);
  return { taxable, taxTotal, total: taxable + taxTotal };
}

/**
 * lines: [{ quantity, unitPrice, taxes: [{ type, rate, priceIncluded }] }]
 * discounts: subscription-wide discounts ({ type, value }); like the server, only the largest
 * applies, spread over lines in proportion to their amount.
 * Returns money strings: { lines: [{ subtotal, discount, tax, amount }], subtotal, discountTotal,
 * taxTotal, total }.
 */
export function previewTotals(lines = [], discounts = []) {
  const rows = lines.map((l) => {
    const qty = Number(l.quantity) || 0;
    return { qty, taxes: l.taxes ?? [], subtotal: Math.round(toPaise(l.unitPrice) * qty) };
  });
  const netTotal = rows.reduce((a, r) => a + r.subtotal, 0);

  const discountTotal = discounts.reduce((best, d) => Math.max(best, discountPaise(d, netTotal)), 0);

  let lastPositive = -1;
  rows.forEach((r, i) => {
    if (r.subtotal > 0) lastPositive = i;
  });
  let spread = 0;
  rows.forEach((r, i) => {
    if (!discountTotal || r.subtotal <= 0) r.share = 0;
    else if (i === lastPositive) r.share = discountTotal - spread;
    else r.share = Math.round((discountTotal * r.subtotal) / netTotal);
    spread += r.share;
  });

  let subtotal = 0;
  let taxTotal = 0;
  let total = 0;
  const out = rows.map((r) => {
    const t = lineTaxes(r.subtotal - r.share, r.qty, r.taxes);
    subtotal += r.subtotal;
    taxTotal += t.taxTotal;
    total += t.total;
    return {
      subtotal: fromPaise(r.subtotal),
      discount: fromPaise(r.share),
      tax: fromPaise(t.taxTotal),
      amount: fromPaise(t.total),
    };
  });

  return {
    lines: out,
    subtotal: fromPaise(subtotal),
    discountTotal: fromPaise(discountTotal),
    taxTotal: fromPaise(taxTotal),
    total: fromPaise(total),
  };
}
