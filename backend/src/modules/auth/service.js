import { query, withTransaction } from '../../config/db.js';
import { loadUser } from '../../middleware/auth.js';
import { createAuthUser, deleteAuthUser, setAuthPassword } from '../../lib/authUsers.js';
import { ConflictError } from '../../lib/errors.js';
import * as repo from './repo.js';

export function presentUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    isActive: user.is_active,
    customerId: user.customer_id ?? null,
  };
}

// Creates a portal login (role customer) for `email`. Used by signup and by staff invites.
// The auth user is removed again if the database step fails.
export async function createCustomerLogin({ email, password, fullName, phone }) {
  if (await repo.findProfileByEmail({ query }, email)) {
    throw new ConflictError('An account with this email already exists');
  }
  const authUser = await createAuthUser({ email, password, fullName });
  try {
    await withTransaction(async (client) => {
      await repo.insertProfile(client, { id: authUser.id, email, fullName, role: 'customer' });
      await repo.linkOrCreateCustomer(client, {
        profileId: authUser.id,
        email,
        name: fullName,
        phone,
      });
    });
  } catch (err) {
    await deleteAuthUser(authUser.id);
    if (err.code === '23505') throw new ConflictError('An account with this email already exists');
    throw err;
  }
  return presentUser(await loadUser(authUser.id));
}

export function signup(input) {
  return createCustomerLogin(input);
}

export async function getMe(userId) {
  return presentUser(await loadUser(userId));
}

export async function updateMe(userId, { fullName }) {
  await repo.updateProfileName({ query }, userId, fullName);
  return getMe(userId);
}

export async function changePassword(userId, { password }) {
  await setAuthPassword(userId, password);
}
