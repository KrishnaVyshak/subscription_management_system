import { z } from 'zod';
import { listQuerySchema } from '../../lib/http.js';
import { isoDate, money } from '../../lib/zod.js';

const STATUSES = ['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'];

export const lineInput = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable().optional(),
  quantity: z.number().int().min(1),
  unitPrice: money.nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

export const addonInput = z.object({
  productId: z.uuid(),
  variantId: z.uuid().nullable().optional(),
  quantity: z.number().int().min(1).default(1),
});

export const listSubscriptionsSchema = listQuerySchema.extend({
  status: z
    .string()
    .transform((v) => v.split(',').filter(Boolean))
    .pipe(z.array(z.enum(STATUSES)))
    .optional(),
  customerId: z.uuid().optional(),
  planId: z.uuid().optional(),
  startFrom: isoDate.optional(),
  startTo: isoDate.optional(),
});

export const createSubscriptionSchema = z
  .object({
    customerId: z.uuid(),
    planId: z.uuid().optional(),
    templateId: z.uuid().optional(),
    startDate: isoDate.optional(),
    expiryDate: isoDate.nullable().optional(),
    quoteValidUntil: isoDate.nullable().optional(),
    paymentTermId: z.uuid().nullable().optional(),
    salespersonId: z.uuid().nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
  })
  .refine((v) => v.planId || v.templateId, { message: 'Give a planId or a templateId', path: ['planId'] });

// Draft/quotation: header fields and `lines` (replaces the set).
// Active/paused: only `quantities`, `addAddons`, `removeLineIds` (effective next period) and notes.
export const updateSubscriptionSchema = z
  .object({
    customerId: z.uuid(),
    planId: z.uuid(),
    startDate: isoDate,
    expiryDate: isoDate.nullable(),
    quoteValidUntil: isoDate.nullable(),
    paymentTermId: z.uuid().nullable(),
    salespersonId: z.uuid().nullable(),
    notes: z.string().max(5000).nullable(),
    lines: z.array(lineInput),
    quantities: z.array(z.object({ lineId: z.uuid(), quantity: z.number().int().min(1) })),
    addAddons: z.array(addonInput),
    removeLineIds: z.array(z.uuid()),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'Nothing to update');

export const transitionSchema = z.object({
  to: z.enum(STATUSES),
  note: z.string().trim().max(1000).optional(),
  reason: z.string().trim().max(100).optional(),
  force: z.boolean().optional(),
});
