import { z } from 'zod';
import { includeInactive, money, nonEmpty } from '../../lib/zod.js';

const valueSchema = z.object({
  value: z.string().trim().min(1).max(100),
  extraPrice: money.default('0'),
});

export const listAttributesSchema = z.object({ includeInactive });

export const createAttributeSchema = z.object({
  name: z.string().trim().min(1).max(100),
  values: z.array(valueSchema).default([]),
});

export const updateAttributeSchema = nonEmpty(
  z.object({ name: z.string().trim().min(1).max(100), isActive: z.boolean() }).partial(),
);

export const createValueSchema = valueSchema;
