import { describe, expect, it } from 'vitest';
import { calculateInvoice, discountAmount } from '../../domain/invoiceCalc.js';
import { D } from '../../lib/money.js';

const gst18 = { id: 'g', name: 'GST 18%', type: 'percent', rate: '18', price_included: false };
const sumOf = (lines, key) => lines.reduce((a, l) => a.plus(l[key]), new D(0)).toFixed(2);

function expectExactSums(calc) {
  expect(sumOf(calc.lines, 'line_subtotal')).toBe(calc.subtotal.toFixed(2));
  expect(sumOf(calc.lines, 'discount_amount')).toBe(calc.discount_total.toFixed(2));
  expect(sumOf(calc.lines, 'tax_amount')).toBe(calc.tax_total.toFixed(2));
  expect(sumOf(calc.lines, 'amount')).toBe(calc.total.toFixed(2));
  for (const l of calc.lines) {
    expect(l.taxable_amount.plus(l.tax_amount).toFixed(2)).toBe(l.amount.toFixed(2));
    expect(l.taxable_amount.gte(0)).toBe(true);
  }
}

describe('invoiceCalc', () => {
  it('subtotal → line discount → spread invoice discount → tax → totals', () => {
    const calc = calculateInvoice(
      [
        { quantity: 10, unit_price: '1000', taxes: [gst18], lineDiscount: { type: 'percent', value: '10' } },
        { quantity: 1, unit_price: '200', taxes: [gst18] },
      ],
      { type: 'fixed', value: '500' },
    );
    // Line 1: 10000 − 1000 = 9000 net; line 2: 200. Invoice ₹500 spread 9000:200.
    expect(calc.lines[0].line_discount.toFixed(2)).toBe('1000.00');
    expect(calc.lines[0].invoice_discount.toFixed(2)).toBe('489.13');
    expect(calc.lines[1].invoice_discount.toFixed(2)).toBe('10.87');
    expect(calc.subtotal.toFixed(2)).toBe('10200.00');
    expect(calc.discount_total.toFixed(2)).toBe('1500.00');
    expect(calc.tax_total.toFixed(2)).toBe('1566.00');
    expect(calc.total.toFixed(2)).toBe('10266.00');
    expectExactSums(calc);
  });

  it('rounding always sums exactly (randomised)', () => {
    let seed = 42;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let run = 0; run < 300; run += 1) {
      const lines = Array.from({ length: 1 + Math.floor(rnd() * 6) }, () => ({
        quantity: 1 + Math.floor(rnd() * 7),
        unit_price: (rnd() * 999).toFixed(2),
        taxes: rnd() > 0.5 ? [gst18] : [{ ...gst18, price_included: true }],
        lineDiscount: rnd() > 0.6 ? { type: 'percent', value: (rnd() * 30).toFixed(2) } : null,
      }));
      const inv = rnd() > 0.5 ? { type: 'percent', value: (rnd() * 20).toFixed(2) } : { type: 'fixed', value: '33.33' };
      expectExactSums(calculateInvoice(lines, inv));
    }
  });

  it('never goes negative', () => {
    expect(discountAmount({ type: 'fixed', value: '500' }, '200').toFixed(2)).toBe('200.00');
    expect(discountAmount({ type: 'percent', value: '150' }, '200').toFixed(2)).toBe('200.00');
    const calc = calculateInvoice(
      [{ quantity: 1, unit_price: '100', taxes: [gst18], lineDiscount: { type: 'fixed', value: '80' } }],
      { type: 'fixed', value: '999' },
    );
    expect(calc.total.toFixed(2)).toBe('0.00');
    expect(calc.discount_total.toFixed(2)).toBe('100.00');
    expectExactSums(calc);
  });

  it('a 0.01 line never gets more than its own net', () => {
    const calc = calculateInvoice(
      [
        { quantity: 1, unit_price: '0.01', taxes: [] },
        { quantity: 1, unit_price: '0.01', taxes: [] },
        { quantity: 1, unit_price: '0.01', taxes: [] },
      ],
      { type: 'fixed', value: '0.02' },
    );
    expectExactSums(calc);
    expect(calc.discount_total.toFixed(2)).toBe('0.02');
  });
});
