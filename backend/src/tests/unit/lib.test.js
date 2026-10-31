import { describe, expect, it } from 'vitest';
import { toCamel, toSnake } from '../../lib/case.js';
import { Where, parseSort } from '../../lib/http.js';
import { fmt, round2 } from '../../lib/money.js';

describe('case conversion', () => {
  it('converts nested keys both ways and leaves dates alone', () => {
    const d = new Date();
    expect(toCamel({ created_at: d, lines: [{ unit_price: '1.00' }] })).toEqual({
      createdAt: d,
      lines: [{ unitPrice: '1.00' }],
    });
    expect(toSnake({ billingAnchorDate: '2026-01-31' })).toEqual({
      billing_anchor_date: '2026-01-31',
    });
  });
});

describe('parseSort', () => {
  const fields = { createdAt: 'x.created_at', name: 'lower(x.name)' };

  it('maps whitelisted fields and direction', () => {
    expect(parseSort('-createdAt', fields, 'f')).toBe('x.created_at desc nulls last');
    expect(parseSort('name', fields, 'f')).toBe('lower(x.name) asc nulls last');
    expect(parseSort(undefined, fields, 'f')).toBe('f');
  });

  it('rejects anything else', () => {
    expect(() => parseSort('id; drop table x', fields, 'f')).toThrow(/Cannot sort/);
  });
});

describe('Where', () => {
  it('numbers parameters in order', () => {
    const w = new Where();
    w.add('a = $?', 1).add('(b ilike $? or c ilike $?)', 'x', 'y');
    expect(String(w)).toBe('where a = $1 and (b ilike $2 or c ilike $3)');
    expect(w.params).toEqual([1, 'x', 'y']);
  });
});

describe('money', () => {
  it('rounds half-up and formats with two decimals', () => {
    expect(fmt('2.345')).toBe('2.35');
    expect(fmt('2.344')).toBe('2.34');
    expect(fmt(1180)).toBe('1180.00');
    expect(round2('0.125').toString()).toBe('0.13');
  });
});
