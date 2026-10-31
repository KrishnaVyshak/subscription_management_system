import { z } from 'zod';
import { listQuerySchema } from '../../lib/http.js';
import { includeInactive, money, nonEmpty } from '../../lib/zod.js';

const lineSchema = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable().optional(),
  quantity: z.number().int().min(1),
  unitPrice: money.nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

const base = {
  name: z.string().trim().min(1).max(200),
  planId: z.uuid(),
  paymentTermId: z.uuid().nullable(),
  validityDays: z.number().int().min(0).max(3650),
  notes: z.string().max(5000).nullable(),
  isActive: z.boolean(),
  lines: z.array(lineSchema),
};

export const listTemplatesSchema = listQuerySchema.extend({ includeInactive });

export const createTemplateSchema = z.object({
  ...base,
  paymentTermId: base.paymentTermId.optional(),
  validityDays: base.validityDays.default(30),
  notes: base.notes.optional(),
  isActive: base.isActive.optional(),
  lines: base.lines.default([]),
});

// `lines`, when given, replaces the whole set.
export const updateTemplateSchema = nonEmpty(z.object(base).partial());
