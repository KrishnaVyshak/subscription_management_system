import { z } from 'zod';
import { listQuerySchema } from '../../lib/http.js';
import { isoDate } from '../../lib/zod.js';

export const INVOICE_STATUSES = ['draft', 'confirmed', 'paid', 'cancelled'];

export const listInvoicesSchema = listQuerySchema.extend({
  status: z
    .string()
    .transform((v) => v.split(',').filter(Boolean))
    .pipe(z.array(z.enum(INVOICE_STATUSES)))
    .optional(),
  overdue: z.stringbool().optional(),
  customerId: z.uuid().optional(),
  subscriptionId: z.uuid().optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
  format: z.enum(['json', 'csv']).default('json'),
});
