import { z } from 'zod';
import { passwordSchema } from '@brightloop/shared';

// Unknown keys (such as "role") are stripped: signup can never choose a role.
export const signupSchema = z.object({
  email: z.email().transform((v) => v.toLowerCase()),
  password: passwordSchema,
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(30).optional(),
});

export const updateMeSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
});

export const changePasswordSchema = z.object({
  password: passwordSchema,
});
