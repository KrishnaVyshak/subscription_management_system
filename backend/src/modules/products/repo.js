import { query } from '../../config/db.js';
import { Where, pageClause, parseSort } from '../../lib/http.js';

const SORT = {
  name: 'lower(p.name)',
  salesPrice: 'p.sales_price',
  type: 'p.type',
  createdAt: 'p.created_at',
};

export async function list(f) {
  const w = new Where();
  if (!f.includeInactive) w.add('p.is_active');
  if (f.type) w.add('p.type = $?', f.type);
  if (f.search) w.add('p.name ilike $?', `%${f.search}%`);
  const { limit, offset } = pageClause(f);
  const { rows } = await query(
    `select p.*,
            (select count(*) from product_variants v where v.product_id = p.id and v.is_active) as variant_count,
            count(*) over() as total
       from products p ${w}
      order by ${parseSort(f.sort, SORT, 'lower(p.name) asc')}
      limit ${limit} offset ${offset}`,
    w.params,
  );
  return { rows: rows.map(({ total, ...r }) => r), total: rows[0]?.total ?? 0 };
}

export async function findById(db, id) {
  const { rows } = await db.query('select * from products where id = $1', [id]);
  return rows[0] ?? null;
}

// Variants with their attribute values; extra prices come back as strings.
export async function variantsFor(db, productIds) {
  const { rows } = await db.query(
    `select v.id, v.product_id, v.name, v.sku, v.is_active,
            coalesce(json_agg(json_build_object(
                'id', av.id, 'attribute_id', a.id, 'attribute', a.name,
                'value', av.value, 'extra_price', av.extra_price::text)
              order by a.name) filter (where av.id is not null), '[]') as values
       from product_variants v
       left join product_variant_values pvv on pvv.variant_id = v.id
       left join attribute_values av on av.id = pvv.attribute_value_id
       left join product_attributes a on a.id = av.attribute_id
      where v.product_id = any($1)
      group by v.id
      order by v.name`,
    [productIds],
  );
  return rows;
}

export async function taxesFor(db, productId) {
  const { rows } = await db.query(
    `select t.* from product_taxes pt join taxes t on t.id = pt.tax_id
      where pt.product_id = $1 order by t.name`,
    [productId],
  );
  return rows;
}

export async function replaceTaxes(db, productId, taxIds) {
  await db.query('delete from product_taxes where product_id = $1', [productId]);
  if (taxIds.length) {
    await db.query(
      `insert into product_taxes (product_id, tax_id)
       select $1, unnest($2::uuid[]) on conflict do nothing`,
      [productId, taxIds],
    );
  }
}

export async function attributeValues(db, ids) {
  const { rows } = await db.query(
    `select av.id, av.value, av.extra_price, av.attribute_id, a.name as attribute
       from attribute_values av join product_attributes a on a.id = av.attribute_id
      where av.id = any($1)`,
    [ids],
  );
  return rows;
}

export async function insertVariant(db, { productId, name, sku, signature, valueIds, createdBy }) {
  const { rows } = await db.query(
    `insert into product_variants (product_id, name, sku, signature, created_by)
     values ($1, $2, $3, $4, $5)
     on conflict (product_id, signature) do nothing
     returning *`,
    [productId, name, sku ?? null, signature, createdBy],
  );
  const variant = rows[0];
  if (!variant) return null;
  await db.query(
    `insert into product_variant_values (variant_id, attribute_value_id)
     select $1, unnest($2::uuid[])`,
    [variant.id, valueIds],
  );
  return variant;
}
