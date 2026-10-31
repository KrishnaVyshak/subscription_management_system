import { z } from 'zod';
import { listQuerySchema } from '../../lib/http.js';
import { isoDate, money } from '../../lib/zod.js';

export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'upi', 'card', 'cheque', 'other'];

export const recordPaymentSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  amount: money.refine((v) => Number(v) > 0, 'Must be greater than 0'),
  paymentDate: isoDate.optional(),
  note: z.string().trim().max(1000).optional(),
});

export const listPaymentsSchema = listQuerySchema.extend({
  invoiceId: z.uuid().optional(),
  customerId: z.uuid().optional(),
  method: z.enum(PAYMENT_METHODS).optional(),
  from: isoDate.optional(),
  to: isoDate.optional(),
});
