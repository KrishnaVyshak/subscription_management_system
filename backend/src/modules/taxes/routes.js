import { z } from 'zod';
import { listQuerySchema } from '../../lib/http.js';
import { decimal4, includeInactive, nonEmpty } from '../../lib/zod.js';
import { simpleResource } from '../catalog/simpleResource.js';

const base = {
  name: z.string().trim().min(1).max(100),
  type: z.enum(['percent', 'fixed']),
  rate: decimal4,
  priceIncluded: z.boolean(),
  isActive: z.boolean(),
};

const percentCap = (v) => v.type !== 'percent' || v.rate === undefined || Number(v.rate) <= 100;

export default simpleResource({
  table: 'taxes',
  label: 'Tax',
  listSchema: listQuerySchema.extend({ includeInactive }),
  createSchema: z
    .object({ ...base, priceIncluded: base.priceIncluded.default(false), isActive: base.isActive.optional() })
    .refine(percentCap, { message: 'A percent tax cannot exceed 100', path: ['rate'] }),
  updateSchema: nonEmpty(z.object(base).partial()).refine(percentCap, {
    message: 'A percent tax cannot exceed 100',
    path: ['rate'],
  }),
  sort: { name: 'lower(name)', rate: 'rate', createdAt: 'created_at' },
  defaultSort: 'lower(name) asc',
  searchColumn: 'name',
});
