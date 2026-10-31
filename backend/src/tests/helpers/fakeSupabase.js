import crypto from 'node:crypto';
import { vi } from 'vitest';

const users = new Map();
const ok = (data = {}) => ({ data, error: null });

// In-memory stand-in for the service-role client's auth API.
export const fakeAuth = {
  users,
  admin: {
    createUser: vi.fn(async ({ email }) => {
      const lower = email.toLowerCase();
      if ([...users.values()].some((u) => u.email === lower)) {
        return {
          data: { user: null },
          error: { status: 422, code: 'email_exists', message: 'User already registered' },
        };
      }
      const user = { id: crypto.randomUUID(), email: lower };
      users.set(user.id, user);
      return ok({ user });
    }),
    deleteUser: vi.fn(async (id) => {
      users.delete(id);
      return ok();
    }),
    updateUserById: vi.fn(async (id) => ok({ user: users.get(id) ?? { id } })),
    listUsers: vi.fn(async () => ok({ users: [...users.values()] })),
  },
  resetPasswordForEmail: vi.fn(async () => ok()),
};

export function resetFakeAuth() {
  users.clear();
  for (const fn of [...Object.values(fakeAuth.admin), fakeAuth.resetPasswordForEmail]) {
    fn.mockClear();
  }
}

export const supabaseAdmin = () => ({ auth: fakeAuth });
