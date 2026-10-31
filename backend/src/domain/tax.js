import { D, round2 } from '../lib/money.js';

const HUNDRED = new D(100);

/**
 * Taxes for one line. `amount` is the line amount after discounts; when the line has
 * price-included taxes it contains them. Each tax is rounded on its own.
 *   percent, excluded: taxable × rate
 *   percent, included: net = (amount − included fixed) / (1 + Σ included rates); tax = net × rate
 *   fixed:             rate × quantity
 * Returns { taxable, taxTotal, total, taxes: [{ ...tax, amount }] } (taxes in input order)
 * with taxable + taxTotal === total exactly.
 */
export function computeLineTaxes(amount, quantity, taxes = []) {
  const gross = new D(amount);
  const fixedAmount = (t) => round2(new D(t.rate).times(quantity));
  const amounts = new Array(taxes.length);

  const includedFixed = taxes
    .filter((t) => t.price_included && t.type === 'fixed')
    .reduce((acc, t) => acc.plus(fixedAmount(t)), new D(0));
  const includedRate = taxes
    .filter((t) => t.price_included && t.type === 'percent')
    .reduce((acc, t) => acc.plus(new D(t.rate).div(HUNDRED)), new D(0));
  const net = D.max(gross.minus(includedFixed), 0).div(new D(1).plus(includedRate));

  let includedTotal = new D(0);
  taxes.forEach((t, i) => {
    if (!t.price_included) return;
    amounts[i] = t.type === 'fixed' ? fixedAmount(t) : round2(net.times(t.rate).div(HUNDRED));
    includedTotal = includedTotal.plus(amounts[i]);
  });
  const taxable = round2(gross.minus(includedTotal));

  taxes.forEach((t, i) => {
    if (t.price_included) return;
    amounts[i] = t.type === 'fixed' ? fixedAmount(t) : round2(taxable.times(t.rate).div(HUNDRED));
  });

  const taxTotal = amounts.reduce((acc, a) => acc.plus(a), new D(0));
  return {
    taxable,
    taxTotal,
    total: taxable.plus(taxTotal),
    taxes: taxes.map((t, i) => ({ ...t, amount: amounts[i] })),
  };
}
