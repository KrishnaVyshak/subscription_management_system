import { query } from '../../config/db.js';
import { buildSet, pageClause, parseSort, Where, withTotal } from '../../lib/http.js';

const SORT = {
  createdAt: 'p.created_at',
  email: 'lower(p.email)',
  fullName: 'lower(p.full_name)',
  role: 'p.role',
};

export async function list(filters) {
  const w = new Where();
  if (filters.role) w.add('p.role = $?', filters.role);
  if (filters.isActive !== undefined) w.add('p.is_active = $?', filters.isActive);
  if (filters.search) {
    w.add('(p.email ilike $? or p.full_name ilike $?)', `%${filters.search}%`, `%${filters.search}%`);
  }
  const { limit, offset } = pageClause(filters);
  const { rows } = await query(
    `select p.id, p.email, p.full_name, p.role, p.is_active, p.created_at, p.updated_at,
            c.id as customer_id, count(*) over() as total
       from profiles p
       left join customers c on c.profile_id = p.id
       ${w}
      order by ${parseSort(filters.sort, SORT, 'p.created_at desc')}
      limit ${limit} offset ${offset}`,
    w.params,
  );
  return withTotal(rows);
}

export async function findById(id) {
  const { rows } = await query(
    `select p.id, p.email, p.full_name, p.role, p.is_active, p.created_at, p.updated_at,
            c.id as customer_id
       from profiles p left join customers c on c.profile_id = p.id
      where p.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function update(id, body) {
  const { sets, params } = buildSet(body, {
    fullName: 'full_name',
    role: 'role',
    isActive: 'is_active',
  });
  params.push(id);
  await query(`update profiles set ${sets.join(', ')} where id = $${params.length}`, params);
  return findById(id);
}
