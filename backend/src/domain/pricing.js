import { D, round2 } from '../lib/money.js';

// Variant price = base + Σ extra_price of its attribute values.
export function variantPrice(basePrice, extraPrices = []) {
  return round2(extraPrices.reduce((acc, p) => acc.plus(p), new D(basePrice)));
}

// Unit price for a subscription/template line. A plan's own product uses plan.price as its
// base; any other product uses its sales_price. Variant extras are added either way.
export function lineUnitPrice({ product, plan, extraPrices = [] }) {
  const base = plan && plan.product_id === product.id ? plan.price : product.sales_price;
  return variantPrice(base, extraPrices);
}
