import { describe, expect, it } from 'vitest';
import { monthlyFactor, period, periodEnd, periodStart } from '../../domain/periods.js';
import { mrr } from '../../domain/mrr.js';

describe('periods', () => {
  it('keeps month ends from the anchor: 31 Jan → 28 Feb → 31 Mar → 30 Apr', () => {
    const starts = [0, 1, 2, 3].map((n) => periodStart('2026-01-31', 'monthly', 1, n));
    expect(starts).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('uses 29 Feb in a leap year and never drifts afterwards', () => {
    expect(periodStart('2028-01-31', 'monthly', 1, 1)).toBe('2028-02-29');
    expect(periodStart('2028-01-31', 'monthly', 1, 2)).toBe('2028-03-31');
    expect(periodStart('2028-02-29', 'yearly', 1, 1)).toBe('2029-02-28');
    expect(periodStart('2028-02-29', 'yearly', 1, 4)).toBe('2032-02-29');
  });

  it('period end is the day before the next start', () => {
    expect(periodEnd('2026-01-31', 'monthly', 1, 0)).toBe('2026-02-27');
    expect(period('2026-01-31', 'monthly', 1, 1)).toEqual({ start: '2026-02-28', end: '2026-03-30' });
    expect(periodEnd('2026-12-31', 'monthly', 1, 0)).toBe('2027-01-30');
  });

  it('handles every period type', () => {
    expect(periodStart('2026-01-01', 'daily', 1, 31)).toBe('2026-02-01');
    expect(periodStart('2026-01-01', 'weekly', 1, 2)).toBe('2026-01-15');
    expect(periodStart('2026-01-01', 'monthly', 1, 12)).toBe('2027-01-01');
    expect(periodStart('2026-01-01', 'yearly', 1, 2)).toBe('2028-01-01');
    expect(periodEnd('2026-01-01', 'weekly', 1, 0)).toBe('2026-01-07');
    expect(periodEnd('2026-01-01', 'daily', 1, 0)).toBe('2026-01-01');
  });

  it('supports interval 3 (quarterly)', () => {
    const starts = [0, 1, 2, 3].map((n) => periodStart('2025-11-30', 'monthly', 3, n));
    expect(starts).toEqual(['2025-11-30', '2026-02-28', '2026-05-30', '2026-08-30']);
    expect(periodStart('2026-01-01', 'weekly', 3, 1)).toBe('2026-01-22');
  });

  it('monthly factors', () => {
    expect(monthlyFactor('monthly').toString()).toBe('1');
    expect(monthlyFactor('yearly').times(12).toString()).toBe('1');
    expect(monthlyFactor('weekly').times(12).toString()).toBe('52');
    expect(monthlyFactor('daily').times(12).toString()).toBe('365');
    expect(monthlyFactor('monthly', 3).times(3).toDecimalPlaces(20).toString()).toBe('1');
  });

  it('MRR = Σ qty × price × factor', () => {
    const lines = [
      { quantity: 2, unit_price: '1000.00' },
      { quantity: 1, unit_price: '200.00' },
    ];
    expect(mrr(lines, 'monthly').toFixed(2)).toBe('2200.00');
    expect(mrr(lines, 'yearly').toFixed(2)).toBe('183.33');
    expect(mrr([{ quantity: 1, unit_price: '120' }], 'weekly').toFixed(2)).toBe('520.00');
  });
});
