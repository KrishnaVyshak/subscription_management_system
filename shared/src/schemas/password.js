import { z } from 'zod';

// "More than eight characters", one uppercase, one lowercase, one special character.
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{9,}$/;

// Individual rules, used for the live checklist under the signup password field.
export const passwordChecks = [
  { id: 'length', label: 'More than 8 characters', test: (v) => v.length >= 9 },
  { id: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { id: 'special', label: 'One special character', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

export const passwordSchema = z
  .string()
  .regex(
    PASSWORD_REGEX,
    'Password must be more than 8 characters with an uppercase, a lowercase and a special character',
  );
