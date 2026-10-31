import { query } from '../../config/db.js';
import { insertRow, updateRow } from '../../lib/crud.js';
import { todayIST } from '../../lib/dates.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import * as repo from './repo.js';

const db = { query };

export function list(filters) {
  return repo.list(filters, todayIST());
}

export async function get(id) {
  const plan = await repo.findById(db, id);
  if (!plan) throw new NotFoundError('Plan not found');
  return plan;
}

async function assertProduct(productId) {
  const { rows } = await query('select id from products where id = $1', [productId]);
  if (!rows[0]) throw new ValidationError('Unknown product', { productId });
}

export async function create(body, userId) {
  await assertProduct(body.productId);
  const row = await insertRow(db, 'plans', { ...body, createdBy: userId });
  return get(row.id);
}

// Subscriptions copy price, period and interval when created, so editing a plan never changes
// existing subscriptions or invoices.
export async function update(id, body) {
  const current = await get(id);
  if (body.productId) await assertProduct(body.productId);
  const from = body.availableFrom !== undefined ? body.availableFrom : current.available_from;
  const to = body.availableTo !== undefined ? body.availableTo : current.available_to;
  if (from && to && to < from) {
    throw new ValidationError('availableTo must be on or after availableFrom');
  }
  await updateRow(db, 'plans', id, body);
  return get(id);
}
