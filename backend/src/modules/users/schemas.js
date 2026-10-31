import { z } from 'zod';
import { listQuerySchema } from '../../lib/http.js';

export const listUsersSchema = listQuerySchema.extend({
  role: z.enum(['admin', 'staff', 'customer']).optional(),
  isActive: z.stringbool().optional(),
});

export const idParams = z.object({ id: z.uuid() });

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    role: z.enum(['admin', 'staff']).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'Nothing to update');

export const createStaffSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  fullName: z.string().trim().min(1).max(200),
});
