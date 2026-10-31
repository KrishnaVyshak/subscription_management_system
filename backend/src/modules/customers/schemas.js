import { z } from 'zod';
import { listQuerySchema } from '../../lib/http.js';
import { includeInactive, nonEmpty } from '../../lib/zod.js';

const base = {
  name: z.string().trim().min(1).max(200),
  email: z.email().transform((v) => v.toLowerCase()),
  phone: z.string().trim().max(30).nullable(),
  billingAddress: z.string().trim().max(1000).nullable(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[0-9A-Z]{15}$/, 'GSTIN has 15 letters/digits')
    .nullable(),
  isActive: z.boolean(),
};

export const listCustomersSchema = listQuerySchema.extend({
  includeInactive,
  hasPortal: z.stringbool().optional(),
});

export const createCustomerSchema = z.object({
  name: base.name,
  email: base.email,
  phone: base.phone.optional(),
  billingAddress: base.billingAddress.optional(),
  gstin: base.gstin.optional(),
});

export const updateCustomerSchema = nonEmpty(z.object(base).partial());
