import { z } from 'zod';

// Money in: "1000", "1000.5" or 1000.5 → "1000.50". At most 2 decimals, never negative.
export const money = z
  .union([z.string().trim(), z.number()])
  .transform((v) => String(v))
  .refine((v) => /^\d{1,10}(\.\d{1,2})?$/.test(v), 'Must be a non-negative amount with up to 2 decimals');

// Tax rates and other non-money decimals (up to 4 places).
export const decimal4 = z
  .union([z.string().trim(), z.number()])
  .transform((v) => String(v))
  .refine((v) => /^\d{1,8}(\.\d{1,4})?$/.test(v), 'Must be a non-negative number');

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .refine((v) => !Number.isNaN(Date.parse(`${v}T00:00:00Z`)), 'Invalid date');

export const idParams = z.object({ id: z.uuid() });

export const includeInactive = z.stringbool().optional();

export const nonEmpty = (schema) =>
  schema.refine((v) => Object.values(v).some((x) => x !== undefined), 'Nothing to update');
