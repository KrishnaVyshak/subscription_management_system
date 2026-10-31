import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../config/db.js';
import { NotFoundError } from '../../lib/errors.js';
import { asyncHandler as h, sendData } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';

// Known settings and the shape of their value.
const VALUE_SCHEMAS = {
  company: z.object({
    name: z.string().trim().min(1).max(200),
    address: z.string().max(1000).default(''),
    email: z.string().max(200).default(''),
    phone: z.string().max(50).default(''),
    gstin: z.string().max(20).default(''),
  }),
  'invoice.auto_confirm': z.boolean(),
};

const keyParams = z.object({ key: z.enum(Object.keys(VALUE_SCHEMAS)) });

export async function getSetting(key, db = { query }) {
  const { rows } = await db.query('select value from settings where key = $1', [key]);
  return rows[0]?.value;
}

const router = Router();

// Returned as [{ key, value }] so dotted keys survive the camelCase conversion.
router.get(
  '/',
  h(async (_req, res) => {
    const { rows } = await query('select key, value, updated_at from settings order by key');
    sendData(res, rows);
  }),
);

router.put(
  '/:key',
  validate({ params: keyParams, body: z.object({ value: z.unknown() }) }),
  h(async (req, res) => {
    const value = VALUE_SCHEMAS[req.params.key].parse(req.body.value);
    const { rows } = await query(
      `insert into settings (key, value) values ($1, $2::jsonb)
       on conflict (key) do update set value = excluded.value
       returning key, value, updated_at`,
      [req.params.key, JSON.stringify(value)],
    );
    if (!rows[0]) throw new NotFoundError('Setting not found');
    sendData(res, rows[0]);
  }),
);

export default router;
