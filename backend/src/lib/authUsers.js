import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../config/supabaseAdmin.js';
import { AppError, ConflictError } from './errors.js';

const isDuplicate = (error) =>
  error?.status === 422 ||
  error?.code === 'email_exists' ||
  /already (been )?registered/i.test(error?.message ?? '');

// Creates a confirmed Supabase Auth user. A random password is used when none is given
// (staff and invited customers set theirs through the password-setup email).
export async function createAuthUser({ email, password, fullName }) {
  const { data, error } = await supabaseAdmin().auth.admin.createUser({
    email,
    password: password ?? `${crypto.randomBytes(24).toString('base64url')}aA!`,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : undefined,
  });
  if (error) {
    if (isDuplicate(error)) throw new ConflictError('An account with this email already exists');
    throw new AppError(502, 'AUTH_PROVIDER_ERROR', error.message);
  }
  return data.user;
}

export async function deleteAuthUser(id) {
  try {
    await supabaseAdmin().auth.admin.deleteUser(id);
  } catch (err) {
    console.error(`Could not roll back auth user ${id}:`, err.message);
  }
}

export async function setAuthPassword(id, password) {
  const { error } = await supabaseAdmin().auth.admin.updateUserById(id, { password });
  if (error) throw new AppError(502, 'AUTH_PROVIDER_ERROR', error.message);
}

// Sends Supabase's reset-password email, which doubles as "set your password" for new accounts.
export async function sendPasswordSetup(email) {
  const { error } = await supabaseAdmin().auth.resetPasswordForEmail(email, {
    redirectTo: `${env.APP_URL}/reset-password`,
  });
  if (error) {
    console.error(`Password-setup email to ${email} failed:`, error.message);
    return false;
  }
  return true;
}

// Finds an existing auth user by email (used by idempotent scripts).
export async function findAuthUserByEmail(email) {
  const target = email.toLowerCase();
  for (let page = 1; page < 100; page += 1) {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new AppError(502, 'AUTH_PROVIDER_ERROR', error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === target);
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
}
