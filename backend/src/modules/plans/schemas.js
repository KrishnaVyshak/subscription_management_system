import { z } from 'zod';
import { listQuerySchema } from '../../lib/http.js';
import { includeInactive, isoDate, money, nonEmpty } from '../../lib/zod.js';

const base = {
  name: z.string().trim().min(1).max(200),
  productId: z.uuid(),
  price: money,
  billingPeriod: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  intervalCount: z.number().int().min(1).max(365),
  minQuantity: z.number().int().min(1),
  availableFrom: isoDate.nullable(),
  availableTo: isoDate.nullable(),
  autoClose: z.boolean(),
  closable: z.boolean(),
  pausable: z.boolean(),
  renewable: z.boolean(),
  isActive: z.boolean(),
};

const datesInOrder = (v) => !v.availableFrom || !v.availableTo || v.availableTo >= v.availableFrom;
const datesMessage = { message: 'availableTo must be on or after availableFrom', path: ['availableTo'] };

export const listPlansSchema = listQuerySchema.extend({
  available: z.stringbool().optional(),
  productId: z.uuid().optional(),
  billingPeriod: base.billingPeriod.optional(),
  includeInactive,
});

export const createPlanSchema = z
  .object({
    ...base,
    intervalCount: base.intervalCount.default(1),
    minQuantity: base.minQuantity.default(1),
    availableFrom: base.availableFrom.optional(),
    availableTo: base.availableTo.optional(),
    autoClose: base.autoClose.default(false),
    closable: base.closable.default(true),
    pausable: base.pausable.default(false),
    renewable: base.renewable.default(false),
    isActive: base.isActive.optional(),
  })
  .refine(datesInOrder, datesMessage);

export const updatePlanSchema = nonEmpty(z.object(base).partial()).refine(datesInOrder, datesMessage);
