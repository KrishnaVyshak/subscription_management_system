import crypto from 'node:crypto';
import { SignJWT } from 'jose';
import { query } from '../../config/db.js';

const secret = () => new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);

export function signToken(sub, { expiresIn = '1h' } = {}) {
  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

let counter = 0;

// Inserts a profile (and a customers row for customers) and returns it with a signed token.
export async function makeUser(role, { email, fullName, isActive = true } = {}) {
  counter += 1;
  const id = crypto.randomUUID();
  const mail = email ?? `${role}${counter}-${id.slice(0, 6)}@test.local`;
  const name = fullName ?? `${role} ${counter}`;
  await query(
    'insert into profiles (id, email, full_name, role, is_active) values ($1, $2, $3, $4, $5)',
    [id, mail, name, role, isActive],
  );
  let customerId = null;
  if (role === 'customer') {
    const { rows } = await query(
      'insert into customers (profile_id, name, email) values ($1, $2, $3) returning id',
      [id, name, mail],
    );
    customerId = rows[0].id;
  }
  const token = await signToken(id);
  return { id, email: mail, fullName: name, role, customerId, token, auth: `Bearer ${token}` };
}
