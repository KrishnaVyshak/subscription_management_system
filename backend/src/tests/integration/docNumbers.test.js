import { expect, it } from 'vitest';
import { query } from '../../config/db.js';
import { describeDb, useDb } from '../helpers/db.js';

describeDb('document numbers', () => {
  useDb();

  it('pad to five digits, grow past 99,999 and take the year from the document date', async () => {
    await query(`select setval('invoice_number_seq', 99998)`);
    const { rows } = await query(
      `select next_doc_number('INV', '2025-12-31') as a, next_doc_number('INV', '2026-01-01') as b,
              next_doc_number('INV', '2026-01-01') as c`,
    );
    expect(rows[0]).toEqual({ a: 'INV/2025/99999', b: 'INV/2026/100000', c: 'INV/2026/100001' });
    await query(`select setval('subscription_number_seq', 1, false)`);
    expect((await query(`select next_doc_number('SUB', '2026-03-01') as n`)).rows[0].n).toBe('SUB/2026/00001');
  });
});
