import { describe, expect, it } from 'vitest';
import { lineUnitPrice, variantPrice } from '../../domain/pricing.js';

describe('pricing', () => {
  it('CRM Suite + Odoo brand = 1560', () => {
    expect(variantPrice('1000.00', ['560.00']).toFixed(2)).toBe('1560.00');
  });

  it('sums several extras and handles none', () => {
    expect(variantPrice('100', ['10.50', '0.25']).toFixed(2)).toBe('110.75');
    expect(variantPrice('100').toFixed(2)).toBe('100.00');
  });

  it("uses plan.price for the plan's own product, sales_price otherwise", () => {
    const product = { id: 'p1', sales_price: '1000.00' };
    const plan = { product_id: 'p1', price: '900.00' };
    expect(lineUnitPrice({ product, plan, extraPrices: ['560'] }).toFixed(2)).toBe('1460.00');
    const addon = { id: 'p2', sales_price: '200.00' };
    expect(lineUnitPrice({ product: addon, plan }).toFixed(2)).toBe('200.00');
  });
});
