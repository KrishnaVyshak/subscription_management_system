import { query, withTransaction } from '../../config/db.js';
import { insertRow, updateRow } from '../../lib/crud.js';
import { todayIST } from '../../lib/dates.js';
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '../../lib/errors.js';
import { pageClause, parseSort, Where, withTotal } from '../../lib/http.js';

const db = { query };

// Same rules as domain/discounts.discountState, in SQL so lists can filter on it.
const STATE_SQL = (today) => `case
    when d.usage_limit is not null and d.usage_count >= d.usage_limit then 'exhausted'
    when d.end_date is not null and d.end_date < ${today} then 'expired'
    when not d.is_active then 'inactive'
    when d.start_date is not null and d.start_date > ${today} then 'scheduled'
    else 'active' end`;

const SORT = {
  name: 'lower(name)',
  createdAt: 'created_at',
  endDate: 'end_date',
  usageCount: 'usage_count',
};

export async function list(f, today = todayIST()) {
  const w = new Where();
  const todayP = w.param(today);
  if (f.scope) w.add('scope = $?', f.scope);
  if (f.search) w.add('name ilike $?', `%${f.search}%`);
  if (f.state) w.add('state = $?', f.state);
  const { limit, offset } = pageClause(f);
  const { rows } = await query(
    `with x as (
       select d.*, ${STATE_SQL(todayP)} as state,
              coalesce((select array_agg(dp.product_id) from discount_products dp
                         where dp.discount_id = d.id), '{}') as product_ids
         from discounts d
     )
     select *, count(*) over() as total from x ${w}
      order by ${parseSort(f.sort, SORT, 'created_at desc')}
      limit ${limit} offset ${offset}`,
    w.params,
  );
  return withTotal(rows);
}

export async function get(id, client = db, today = todayIST()) {
  const { rows } = await client.query(
    `select d.*, ${STATE_SQL('$2')} as state,
            coalesce((select json_agg(json_build_object('id', p.id, 'name', p.name) order by p.name)
                        from discount_products dp join products p on p.id = dp.product_id
                       where dp.discount_id = d.id), '[]') as products,
            (select coalesce(sum(u.amount), 0)::text from discount_usages u
              where u.discount_id = d.id) as total_discounted
       from discounts d where d.id = $1`,
    [id, today],
  );
  if (!rows[0]) throw new NotFoundError('Discount not found');
  return rows[0];
}

async function setProducts(client, discountId, productIds) {
  if (productIds.length) {
    const { rows } = await client.query('select id from products where id = any($1)', [productIds]);
    if (rows.length !== new Set(productIds).size) throw new ValidationError('Unknown product id');
  }
  await client.query('delete from discount_products where discount_id = $1', [discountId]);
  if (productIds.length) {
    await client.query(
      `insert into discount_products (discount_id, product_id)
       select $1, unnest($2::uuid[]) on conflict do nothing`,
      [discountId, productIds],
    );
  }
}

export async function create({ productIds, ...body }, userId) {
  const id = await withTransaction(async (client) => {
    const row = await insertRow(client, 'discounts', { ...body, createdBy: userId });
    await setProducts(client, row.id, body.scope === 'product' ? productIds : []);
    return row.id;
  });
  return get(id);
}

// Once used, type, value and scope are locked (DISCOUNT_IN_USE).
export async function update(id, { productIds, ...body }) {
  await withTransaction(async (client) => {
    const { rows } = await client.query('select * from discounts where id = $1 for update', [id]);
    const current = rows[0];
    if (!current) throw new NotFoundError('Discount not found');
    const used = current.usage_count > 0;
    const changes = {
      type: body.type !== undefined && body.type !== current.type,
      value: body.value !== undefined && Number(body.value) !== Number(current.value),
      scope: body.scope !== undefined && body.scope !== current.scope,
    };
    const locked = Object.keys(changes).filter((k) => changes[k]);
    if (used && locked.length) {
      throw new BusinessRuleError('This discount has been used; its type, value and scope are locked', {
        rule: 'DISCOUNT_IN_USE',
        fields: locked,
      });
    }
    const merged = { ...current, ...body };
    const startDate = body.startDate !== undefined ? body.startDate : current.start_date;
    const endDate = body.endDate !== undefined ? body.endDate : current.end_date;
    if (startDate && endDate && endDate < startDate) {
      throw new ValidationError('endDate must be on or after startDate');
    }
    if (merged.type === 'percent' && Number(merged.value) > 100) {
      throw new ValidationError('A percent discount cannot exceed 100');
    }
    if (body.usageLimit != null && body.usageLimit < current.usage_count) {
      throw new ValidationError(`usageLimit cannot be below the ${current.usage_count} uses so far`);
    }
    await updateRow(client, 'discounts', id, body);

    const scope = body.scope ?? current.scope;
    if (scope === 'subscription') {
      await setProducts(client, id, []);
    } else if (productIds) {
      if (!productIds.length) throw new ValidationError('A product discount needs at least one product');
      await setProducts(client, id, productIds);
    } else if (changes.scope) {
      throw new ValidationError('A product discount needs at least one product');
    }
  });
  return get(id);
}

export async function attachedTo(client, subscriptionId) {
  const { rows } = await client.query(
    `select d.id, d.name, d.type, d.value, d.scope, d.start_date, d.end_date, d.usage_limit,
            d.usage_count, d.is_active, sd.created_at as attached_at
       from subscription_discounts sd join discounts d on d.id = sd.discount_id
      where sd.subscription_id = $1 order by d.name`,
    [subscriptionId],
  );
  return rows;
}

export async function attach(subscriptionId, discountId, userId) {
  await withTransaction(async (client) => {
    const { rows: subs } = await client.query('select status from subscriptions where id = $1', [
      subscriptionId,
    ]);
    if (!subs[0]) throw new NotFoundError('Subscription not found');
    if (subs[0].status === 'closed') {
      throw new BusinessRuleError('A closed subscription cannot get discounts', { rule: 'SUBSCRIPTION_CLOSED' });
    }
    const discount = await get(discountId, client);
    if (discount.scope !== 'subscription') {
      throw new BusinessRuleError('Only subscription discounts can be attached', { rule: 'DISCOUNT_SCOPE' });
    }
    const { rowCount } = await client.query(
      `insert into subscription_discounts (subscription_id, discount_id, created_by)
       values ($1, $2, $3) on conflict do nothing`,
      [subscriptionId, discountId, userId],
    );
    if (!rowCount) throw new ConflictError('This discount is already attached');
  });
}

export async function detach(subscriptionId, discountId) {
  const { rowCount } = await query(
    'delete from subscription_discounts where subscription_id = $1 and discount_id = $2',
    [subscriptionId, discountId],
  );
  if (!rowCount) throw new NotFoundError('This discount is not attached');
}

export async function usagesForInvoice(client, invoiceId) {
  const { rows } = await client.query(
    `select u.discount_id, d.name, d.type, d.value, d.scope, u.amount
       from discount_usages u join discounts d on d.id = u.discount_id
      where u.invoice_id = $1 order by d.name`,
    [invoiceId],
  );
  return rows;
}
