import { z } from 'zod';
import { listQuerySchema } from '../../lib/http.js';
import { includeInactive, money, nonEmpty } from '../../lib/zod.js';

const base = {
  name: z.string().trim().min(1).max(200),
  type: z.enum(['service', 'goods', 'addon']),
  salesPrice: money,
  costPrice: money,
  notes: z.string().max(5000).nullable(),
  isActive: z.boolean(),
};

export const listProductsSchema = listQuerySchema.extend({
  type: z.enum(['service', 'goods', 'addon']).optional(),
  includeInactive,
});

export const createProductSchema = z.object({
  ...base,
  type: base.type.default('service'),
  costPrice: base.costPrice.default('0'),
  notes: base.notes.optional(),
  isActive: base.isActive.optional(),
  taxIds: z.array(z.uuid()).optional(),
});

export const updateProductSchema = nonEmpty(z.object(base).partial());

export const createVariantSchema = z.object({
  attributeValueIds: z.array(z.uuid()).min(1),
  sku: z.string().trim().min(1).max(64).optional(),
});

export const variantParams = z.object({ id: z.uuid(), variantId: z.uuid() });

export const updateVariantSchema = nonEmpty(
  z.object({ sku: z.string().trim().min(1).max(64).nullable(), isActive: z.boolean() }).partial(),
);

export const setTaxesSchema = z.object({ taxIds: z.array(z.uuid()) });
