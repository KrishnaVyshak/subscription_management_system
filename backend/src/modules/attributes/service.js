import { query, withTransaction } from '../../config/db.js';
import { insertRow, updateRow } from '../../lib/crud.js';
import { NotFoundError } from '../../lib/errors.js';

const SELECT = `
  select a.*,
         coalesce(json_agg(json_build_object('id', v.id, 'value', v.value,
                  'extra_price', v.extra_price::text, 'is_active', v.is_active)
                  order by v.value) filter (where v.id is not null), '[]') as values
    from product_attributes a
    left join attribute_values v on v.attribute_id = a.id`;

export async function list({ includeInactive }) {
  const { rows } = await query(
    `${SELECT} ${includeInactive ? '' : 'where a.is_active'} group by a.id order by lower(a.name)`,
  );
  return rows;
}

export async function get(id) {
  const { rows } = await query(`${SELECT} where a.id = $1 group by a.id`, [id]);
  if (!rows[0]) throw new NotFoundError('Attribute not found');
  return rows[0];
}

export async function create({ name, values }, userId) {
  const id = await withTransaction(async (client) => {
    const attr = await insertRow(client, 'product_attributes', { name, createdBy: userId });
    for (const v of values) {
      await insertRow(client, 'attribute_values', { attributeId: attr.id, ...v });
    }
    return attr.id;
  });
  return get(id);
}

export async function update(id, body) {
  const row = await updateRow({ query }, 'product_attributes', id, body);
  if (!row) throw new NotFoundError('Attribute not found');
  return get(id);
}

export async function addValue(id, body) {
  await get(id);
  await insertRow({ query }, 'attribute_values', { attributeId: id, ...body });
  return get(id);
}
