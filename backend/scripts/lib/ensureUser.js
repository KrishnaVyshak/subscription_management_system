import { query } from '../../src/config/db.js';
import { supabaseAdmin } from '../../src/config/supabaseAdmin.js';
import { findAuthUserByEmail } from '../../src/lib/authUsers.js';

// Idempotently makes sure an auth user + profile exist with this role and password.
// For customers, also links/creates the customers row. Returns { id, created }.
export async function ensureUser({ email, password, fullName, role, customer }) {
  const admin = supabaseAdmin().auth.admin;
  let authUser = await findAuthUserByEmail(email);
  let created = false;

  if (!authUser) {
    const { data, error } = await admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    authUser = data.user;
    created = true;
  } else {
    const { error } = await admin.updateUserById(authUser.id, { password, email_confirm: true });
    if (error) throw new Error(`updateUserById ${email}: ${error.message}`);
  }

  // A stale profile with the same email but another id (auth user recreated) is replaced.
  await query('delete from profiles where lower(email) = lower($1) and id <> $2', [email, authUser.id]);
  await query(
    `insert into profiles (id, email, full_name, role, is_active)
     values ($1, $2, $3, $4, true)
     on conflict (id) do update
       set email = excluded.email, full_name = excluded.full_name,
           role = excluded.role, is_active = true`,
    [authUser.id, email, fullName, role],
  );

  if (role === 'customer') {
    await query(
      `insert into customers (profile_id, name, email, phone, billing_address, gstin)
       values ($1, $2, $3, $4, $5, $6)
       on conflict ((lower(email))) do update set profile_id = excluded.profile_id`,
      [
        authUser.id,
        customer?.name ?? fullName,
        email,
        customer?.phone ?? null,
        customer?.billingAddress ?? null,
        customer?.gstin ?? null,
      ],
    );
  }

  return { id: authUser.id, created };
}
