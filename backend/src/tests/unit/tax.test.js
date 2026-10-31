import { describe, expect, it } from 'vitest';
import { computeLineTaxes } from '../../domain/tax.js';

const gst18 = { id: 'a', name: 'GST 18%', type: 'percent', rate: '18', price_included: false };
const gst18inc = { ...gst18, id: 'b', price_included: true };
const cess = { id: 'c', name: 'Cess', type: 'fixed', rate: '2.50', price_included: false };
const s = (r) => ({
  taxable: r.taxable.toFixed(2),
  tax: r.taxTotal.toFixed(2),
  total: r.total.toFixed(2),
  each: r.taxes.map((t) => t.amount.toFixed(2)),
});

describe('tax', () => {
  it('percent excluded: base × rate', () => {
    expect(s(computeLineTaxes('1000', 1, [gst18]))).toEqual({
      taxable: '1000.00',
      tax: '180.00',
      total: '1180.00',
      each: ['180.00'],
    });
  });

  it('percent included: base = price / (1 + rate)', () => {
    expect(s(computeLineTaxes('1180', 1, [gst18inc]))).toEqual({
      taxable: '1000.00',
      tax: '180.00',
      total: '1180.00',
      each: ['180.00'],
    });
    // 100 / 1.18 = 84.745… → tax 15.25, base 84.75
    expect(s(computeLineTaxes('100', 1, [gst18inc]))).toEqual({
      taxable: '84.75',
      tax: '15.25',
      total: '100.00',
      each: ['15.25'],
    });
  });

  it('fixed: rate × qty', () => {
    expect(s(computeLineTaxes('500', 4, [cess]))).toEqual({
      taxable: '500.00',
      tax: '10.00',
      total: '510.00',
      each: ['10.00'],
    });
  });

  it('mixed included, excluded and fixed, each rounded on its own', () => {
    const gst5 = { id: 'd', name: 'GST 5%', type: 'percent', rate: '5', price_included: false };
    const r = computeLineTaxes('333.33', 3, [gst18inc, gst5, cess]);
    // net = 333.33 / 1.18 = 282.483… → included 50.85; taxable 282.48; 5% → 14.12; cess 7.50
    expect(s(r)).toEqual({
      taxable: '282.48',
      tax: '72.47',
      total: '354.95',
      each: ['50.85', '14.12', '7.50'],
    });
  });

  it('no taxes', () => {
    expect(s(computeLineTaxes('10.10', 1, []))).toEqual({
      taxable: '10.10',
      tax: '0.00',
      total: '10.10',
      each: [],
    });
  });
});
