import { z } from 'zod';
import { listQuerySchema } from '../../lib/http.js';
import { includeInactive, nonEmpty } from '../../lib/zod.js';
import { simpleResource } from '../catalog/simpleResource.js';

const base = {
  name: z.string().trim().min(1).max(100),
  dueDays: z.number().int().min(0).max(3650),
  isActive: z.boolean(),
};

export default simpleResource({
  table: 'payment_terms',
  label: 'Payment term',
  listSchema: listQuerySchema.extend({ includeInactive }),
  createSchema: z.object({ ...base, isActive: base.isActive.optional() }),
  updateSchema: nonEmpty(z.object(base).partial()),
  sort: { name: 'lower(name)', dueDays: 'due_days', createdAt: 'created_at' },
  defaultSort: 'due_days asc',
  searchColumn: 'name',
});
