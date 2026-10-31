import { query, withTransaction } from '../../config/db.js';
import { insertRow, updateRow } from '../../lib/crud.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { pageClause, parseSort, Where, withTotal } from '../../lib/http.js';
import { resolveLines } from '../catalog/lineResolver.js';

const SORT = { name: 'lower(t.name)', createdAt: 't.created_at', validityDays: 't.validity_days' };

export async function list(f) {
  const w = new Where();
  if (!f.includeInactive) w.add('t.is_active');
  if (f.search) w.add('t.name ilike $?', `%${f.search}%`);
  const { limit, offset } = pageClause(f);
  const { rows } = await query(
    `select t.*, pl.name as plan_name, pt.name as payment_term_name,
            (select count(*) from template_lines l where l.template_id = t.id) as line_count,
            count(*) over() as total
       from quotation_templates t
       join plans pl on pl.id = t.plan_id
       left join payment_terms pt on pt.id = t.payment_term_id
       ${w}
      order by ${parseSort(f.sort, SORT, 'lower(t.name) asc')}
      limit ${limit} offset ${offset}`,
    w.params,
  );
  return withTotal(rows);
}

export async function getTemplate(db, id) {
  const { rows } = await db.query(
    `select t.*, pl.name as plan_name, pt.name as payment_term_name
       from quotation_templates t
       join plans pl on pl.id = t.plan_id
       left join payment_terms pt on pt.id = t.payment_term_id
      where t.id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const lines = await db.query(
    `select l.*, p.name as product_name, p.type as product_type, v.name as variant_name
       from template_lines l
       join products p on p.id = l.product_id
       left join product_variants v on v.id = l.variant_id
      where l.template_id = $1 order by l.sort_order, l.created_at`,
    [id],
  );
  return { ...rows[0], lines: lines.rows };
}

export async function get(id) {
  const template = await getTemplate({ query }, id);
  if (!template) throw new NotFoundError('Template not found');
  return template;
}

async function loadPlan(client, planId) {
  const { rows } = await client.query('select * from plans where id = $1', [planId]);
  if (!rows[0]) throw new ValidationError('Unknown plan', { planId });
  return rows[0];
}

async function replaceLines(client, templateId, plan, lines) {
  await resolveLines(client, lines, plan); // validates products and variants
  await client.query('delete from template_lines where template_id = $1', [templateId]);
  for (const [i, l] of lines.entries()) {
    await insertRow(client, 'template_lines', {
      templateId,
      productId: l.productId,
      variantId: l.variantId ?? null,
      quantity: l.quantity,
      unitPrice: l.unitPrice ?? null,
      description: l.description ?? null,
      sortOrder: i,
    });
  }
}

export async function create({ lines, ...body }, userId) {
  const id = await withTransaction(async (client) => {
    const plan = await loadPlan(client, body.planId);
    const row = await insertRow(client, 'quotation_templates', { ...body, createdBy: userId });
    await replaceLines(client, row.id, plan, lines);
    return row.id;
  });
  return get(id);
}

export async function update(id, { lines, ...body }) {
  await withTransaction(async (client) => {
    const current = await updateRow(client, 'quotation_templates', id, body);
    if (!current) throw new NotFoundError('Template not found');
    if (lines) await replaceLines(client, id, await loadPlan(client, current.plan_id), lines);
  });
  return get(id);
}
