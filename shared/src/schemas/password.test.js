import { describe, expect, it } from 'vitest';
import { passwordChecks, passwordSchema } from './password.js';

describe('passwordSchema', () => {
  it.each(['Abcdefg!1', 'Abcdefgh!'])('accepts %s', (pw) => {
    expect(passwordSchema.safeParse(pw).success).toBe(true);
  });

  it.each(['Abcdefg!', 'abcdefgh!', 'ABCDEFGH!', 'Abcdefghi'])('rejects %s', (pw) => {
    expect(passwordSchema.safeParse(pw).success).toBe(false);
  });

  it('checklist agrees with the schema', () => {
    for (const pw of ['Abcdefg!1', 'Abcdefg!', 'abcdefgh!']) {
      const allPass = passwordChecks.every((c) => c.test(pw));
      expect(allPass).toBe(passwordSchema.safeParse(pw).success);
    }
  });
});
