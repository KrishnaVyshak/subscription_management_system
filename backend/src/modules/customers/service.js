import { query } from '../../config/db.js';
import { sendPasswordSetup } from '../../lib/authUsers.js';
import { insertRow, updateRow } from '../../lib/crud.js';
import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { createCustomerLogin } from '../auth/service.js';
import * as repo from './repo.js';

const db = { query };

export function list(filters) {
  return repo.list(filters);
}

export async function get(id) {
  const customer = await repo.findById(db, id);
  if (!customer) throw new NotFoundError('Customer not found');
  return { ...customer, ...(await repo.counts(id)) };
}

export async function create(body, userId) {
  const row = await insertRow(db, 'customers', { ...body, createdBy: userId });
  return get(row.id);
}

export async function update(id, body) {
  const current = await repo.findById(db, id);
  if (!current) throw new NotFoundError('Customer not found');
  // The email is also the portal login, so it is fixed once a login exists.
  if (body.email && current.profile_id && body.email !== current.email.toLowerCase()) {
    throw new ConflictError('The email of a customer with a portal login cannot be changed');
  }
  await updateRow(db, 'customers', id, body);
  return get(id);
}

// Creates a portal login for an existing customer and emails a password-setup link.
export async function invite(id) {
  const customer = await repo.findById(db, id);
  if (!customer) throw new NotFoundError('Customer not found');
  if (customer.profile_id) throw new ConflictError('This customer already has a portal login');
  await createCustomerLogin({ email: customer.email.toLowerCase(), fullName: customer.name });
  const passwordEmailSent = await sendPasswordSetup(customer.email);
  return { ...(await get(id)), password_email_sent: passwordEmailSent };
}
