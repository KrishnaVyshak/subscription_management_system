import { z } from 'zod';
import { listQuerySchema } from '../../lib/http.js';
import { isoDate, money, nonEmpty } from '../../lib/zod.js';

const base = {
  name: z.string().trim().min(1).max(200),
  type: z.enum(['percent', 'fixed']),
  value: money.refine((v) => Number(v) > 0, 'Must be greater than 0'),
  scope: z.enum(['product', 'subscription']),
  minAmount: money.nullable(),
  minQuantity: z.number().int().min(1).nullable(),
  startDate: isoDate.nullable(),
  endDate: isoDate.nullable(),
  usageLimit: z.number().int().min(1).nullable(),
  isActive: z.boolean(),
  productIds: z.array(z.uuid()),
};

const rules = (schema) =>
  schema
    .refine((v) => !v.startDate || !v.endDate || v.endDate >= v.startDate, {
      message: 'endDate must be on or after startDate',
      path: ['endDate'],
    })
    .refine((v) => v.type !== 'percent' || v.value === undefined || Number(v.value) <= 100, {
      message: 'A percent discount cannot exceed 100',
      path: ['value'],
    });

export const DISCOUNT_STATES = ['scheduled', 'active', 'expired', 'exhausted', 'inactive'];

export const listDiscountsSchema = listQuerySchema.extend({
  state: z.enum(DISCOUNT_STATES).optional(),
  scope: base.scope.optional(),
});

export const createDiscountSchema = rules(
  z.object({
    ...base,
    minAmount: base.minAmount.optional(),
    minQuantity: base.minQuantity.optional(),
    startDate: base.startDate.optional(),
    endDate: base.endDate.optional(),
    usageLimit: base.usageLimit.optional(),
    isActive: base.isActive.optional(),
    productIds: base.productIds.default([]),
  }),
).refine((v) => v.scope !== 'product' || v.productIds.length > 0, {
  message: 'A product discount needs at least one product',
  path: ['productIds'],
});

export const updateDiscountSchema = rules(nonEmpty(z.object(base).partial()));

export const attachSchema = z.object({ discountId: z.uuid() });
export const detachParams = z.object({ id: z.uuid(), discountId: z.uuid() });
