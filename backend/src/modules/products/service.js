import { query, withTransaction } from '../../config/db.js';
import { variantPrice } from '../../domain/pricing.js';
import { insertRow, updateRow } from '../../lib/crud.js';
import { ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { fmt } from '../../lib/money.js';
import * as repo from './repo.js';

const db = { query };

export function list(filters) {
  return repo.list(filters);
}

function withPrice(product, variant) {
  const extras = variant.values.map((v) => v.extra_price);
  return { ...variant, price: fmt(variantPrice(product.sales_price, extras)) };
}

export async function getDetail(id) {
  const product = await repo.findById(db, id);
  if (!product) throw new NotFoundError('Product not found');
  const [variants, taxes] = await Promise.all([
    repo.variantsFor(db, [id]),
    repo.taxesFor(db, id),
  ]);
  return { ...product, variants: variants.map((v) => withPrice(product, v)), taxes };
}

async function assertTaxesExist(client, taxIds) {
  if (!taxIds.length) return;
  const { rows } = await client.query('select id from taxes where id = any($1)', [taxIds]);
  if (rows.length !== new Set(taxIds).size) throw new ValidationError('Unknown tax id', { taxIds });
}

export async function create(body, userId) {
  const { taxIds = [], ...fields } = body;
  const id = await withTransaction(async (client) => {
    await assertTaxesExist(client, taxIds);
    const product = await insertRow(client, 'products', { ...fields, createdBy: userId });
    await repo.replaceTaxes(client, product.id, taxIds);
    return product.id;
  });
  return getDetail(id);
}

export async function update(id, body) {
  const row = await updateRow(db, 'products', id, body);
  if (!row) throw new NotFoundError('Product not found');
  return getDetail(id);
}

export async function setTaxes(id, taxIds) {
  await withTransaction(async (client) => {
    if (!(await repo.findById(client, id))) throw new NotFoundError('Product not found');
    await assertTaxesExist(client, taxIds);
    await repo.replaceTaxes(client, id, taxIds);
  });
  return getDetail(id);
}

// Name is built from the product and its values, e.g. "CRM Suite (Odoo)". One value per attribute.
export async function createVariant(productId, { attributeValueIds, sku }, userId) {
  const ids = [...new Set(attributeValueIds)];
  const variantId = await withTransaction(async (client) => {
    const product = await repo.findById(client, productId);
    if (!product) throw new NotFoundError('Product not found');
    const values = await repo.attributeValues(client, ids);
    if (values.length !== ids.length) throw new ValidationError('Unknown attribute value id');
    if (new Set(values.map((v) => v.attribute_id)).size !== values.length) {
      throw new ValidationError('Pick at most one value per attribute');
    }
    values.sort((a, b) => a.attribute.localeCompare(b.attribute));
    const name = `${product.name} (${values.map((v) => v.value).join(', ')})`;
    const variant = await repo.insertVariant(client, {
      productId,
      name,
      sku,
      signature: [...ids].sort().join(','),
      valueIds: ids,
      createdBy: userId,
    });
    if (!variant) throw new ConflictError('This variant combination already exists');
    return variant.id;
  });
  const detail = await getDetail(productId);
  return detail.variants.find((v) => v.id === variantId);
}

export async function updateVariant(productId, variantId, body) {
  const { rows } = await query('select id from product_variants where id = $1 and product_id = $2', [
    variantId,
    productId,
  ]);
  if (!rows[0]) throw new NotFoundError('Variant not found');
  await updateRow(db, 'product_variants', variantId, body);
  const detail = await getDetail(productId);
  return detail.variants.find((v) => v.id === variantId);
}
