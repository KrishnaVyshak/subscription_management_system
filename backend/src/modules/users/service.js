import { query } from '../../config/db.js';
import { createAuthUser, deleteAuthUser, sendPasswordSetup } from '../../lib/authUsers.js';
import { BusinessRuleError, ConflictError, NotFoundError } from '../../lib/errors.js';
import * as authRepo from '../auth/repo.js';
import * as repo from './repo.js';

export function list(filters) {
  return repo.list(filters);
}

export async function update(actorId, id, body) {
  const user = await repo.findById(id);
  if (!user) throw new NotFoundError('User not found');
  if (id === actorId && body.isActive === false) {
    throw new BusinessRuleError('You cannot deactivate your own account', {
      rule: 'CANNOT_DEACTIVATE_SELF',
    });
  }
  if (id === actorId && body.role && body.role !== user.role) {
    throw new BusinessRuleError('You cannot change your own role', { rule: 'CANNOT_CHANGE_OWN_ROLE' });
  }
  if (body.role && user.role === 'customer') {
    throw new BusinessRuleError('Customer accounts cannot be given a staff role', {
      rule: 'CUSTOMER_ROLE_FIXED',
    });
  }
  return repo.update(id, body);
}

// Only the admin creates staff. The new user sets a password through the emailed link.
export async function createStaff({ email, fullName }) {
  if (await authRepo.findProfileByEmail({ query }, email)) {
    throw new ConflictError('An account with this email already exists');
  }
  const authUser = await createAuthUser({ email, fullName });
  try {
    await authRepo.insertProfile({ query }, { id: authUser.id, email, fullName, role: 'staff' });
  } catch (err) {
    await deleteAuthUser(authUser.id);
    if (err.code === '23505') throw new ConflictError('An account with this email already exists');
    throw err;
  }
  const passwordEmailSent = await sendPasswordSetup(email);
  return { ...(await repo.findById(authUser.id)), password_email_sent: passwordEmailSent };
}
