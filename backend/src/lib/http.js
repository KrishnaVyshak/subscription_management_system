import { z } from 'zod';
import { toCamel } from './case.js';
import { ValidationError } from './errors.js';

// Express 4 does not forward rejected promises; wrap every async handler.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function sendData(res, data, status = 200) {
  return res.status(status).json({ data: toCamel(data) });
}

export function sendList(res, rows, { page, pageSize, total }, extraMeta = {}) {
  return res.json({ data: toCamel(rows), meta: { page, pageSize, total, ...toCamel(extraMeta) } });
}

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.string().optional(),
  search: z.string().trim().min(1).optional(),
});

// sort=-createdAt → "created_at desc". `fields` maps API names to SQL expressions (the whitelist).
export function parseSort(sort, fields, fallback) {
  if (!sort) return fallback;
  const desc = sort.startsWith('-');
  const key = desc ? sort.slice(1) : sort;
  const expr = fields[key];
  if (!expr) {
    throw new ValidationError(`Cannot sort by "${key}"`, { allowed: Object.keys(fields) });
  }
  return `${expr} ${desc ? 'desc' : 'asc'} nulls last`;
}

export function pageClause({ page, pageSize }) {
  return { limit: pageSize, offset: (page - 1) * pageSize };
}

// Collects WHERE fragments with positional params: w.add('status = $?', value).
export class Where {
  constructor(params = []) {
    this.params = params;
    this.parts = [];
  }

  add(fragment, ...values) {
    let sql = fragment;
    for (const v of values) {
      this.params.push(v);
      sql = sql.replace('$?', `$${this.params.length}`);
    }
    this.parts.push(sql);
    return this;
  }

  param(value) {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  toString() {
    return this.parts.length ? `where ${this.parts.join(' and ')}` : '';
  }
}

// Builds "col = $n" pairs for a PATCH from a camelCase body, keeping only allowed columns.
export function buildSet(body, columns, params = []) {
  const sets = [];
  for (const [key, column] of Object.entries(columns)) {
    if (body[key] === undefined) continue;
    params.push(body[key]);
    sets.push(`${column} = $${params.length}`);
  }
  return { sets, params };
}
