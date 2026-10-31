import { D, round2 } from '../lib/money.js';
import { computeLineTaxes } from './tax.js';

// Discount amount on `base`: percent of it, or a fixed amount. Never more than base, never < 0.
export function discountAmount(discount, base) {
  if (!discount) return new D(0);
  const b = D.max(new D(base), 0);
  const raw = discount.type === 'percent' ? round2(b.times(discount.value).div(100)) : round2(discount.value);
  return D.min(D.max(raw, 0), b);
}

/**
 * Builds invoice lines and totals.
 *  1. subtotal = qty × unit_price
 *  2. line discount (lineDiscount on each line)
 *  3. invoice discount spread over lines in proportion to their net (remainder on the last)
 *  4. tax on the discounted amount
 *  5. totals = sums of the rounded lines, so lines always add up exactly to the header
 *
 * lines: [{ quantity, unit_price, taxes, lineDiscount?, ...passthrough }]
 * invoiceDiscount: { type, value } | null
 */
export function calculateInvoice(lines, invoiceDiscount = null) {
  const rows = lines.map((line) => {
    const subtotal = round2(new D(line.unit_price).times(line.quantity));
    const lineDiscount = discountAmount(line.lineDiscount, subtotal);
    return { line, subtotal, lineDiscount, net: subtotal.minus(lineDiscount) };
  });

  const netTotal = rows.reduce((acc, r) => acc.plus(r.net), new D(0));
  const invoiceDiscountTotal = discountAmount(invoiceDiscount, netTotal);

  // Proportional spread; the last line with a positive net takes the rounding remainder.
  let lastPositive = -1;
  rows.forEach((r, i) => {
    if (r.net.gt(0)) lastPositive = i;
  });
  let spread = new D(0);
  rows.forEach((r, i) => {
    if (invoiceDiscountTotal.isZero() || !r.net.gt(0)) {
      r.share = new D(0);
    } else if (i === lastPositive) {
      r.share = invoiceDiscountTotal.minus(spread);
    } else {
      r.share = round2(invoiceDiscountTotal.times(r.net).div(netTotal));
    }
    spread = spread.plus(r.share);
  });
  // Rounding can push a tiny line's share above its net; move the excess to lines with room.
  let overflow = new D(0);
  for (const r of rows) {
    if (r.share.gt(r.net)) {
      overflow = overflow.plus(r.share.minus(r.net));
      r.share = r.net;
    }
  }
  for (const r of [...rows].reverse()) {
    if (overflow.isZero()) break;
    const take = D.min(r.net.minus(r.share), overflow);
    r.share = r.share.plus(take);
    overflow = overflow.minus(take);
  }

  const out = rows.map(({ line, subtotal, lineDiscount, net, share }) => {
    const discounted = net.minus(share);
    const tax = computeLineTaxes(discounted, line.quantity, line.taxes ?? []);
    return {
      ...line,
      line_subtotal: subtotal,
      line_discount: lineDiscount,
      invoice_discount: share,
      discount_amount: lineDiscount.plus(share),
      taxable_amount: tax.taxable,
      tax_amount: tax.taxTotal,
      amount: tax.total,
      tax_lines: tax.taxes,
    };
  });

  const total = (key) => out.reduce((acc, l) => acc.plus(l[key]), new D(0));
  return {
    lines: out,
    subtotal: total('line_subtotal'),
    discount_total: total('discount_amount'),
    invoice_discount_total: invoiceDiscountTotal,
    taxable_total: total('taxable_amount'),
    tax_total: total('tax_amount'),
    total: total('amount'),
  };
}
