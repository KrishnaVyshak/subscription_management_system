import { Router } from 'express';
import { query } from '../../config/db.js';
import { findRow, insertRow, updateRow } from '../../lib/crud.js';
import { NotFoundError } from '../../lib/errors.js';
import { Where, asyncHandler as h, pageClause, parseSort, sendData, sendList } from '../../lib/http.js';
import { idParams } from '../../lib/zod.js';
import { validate } from '../../middleware/validate.js';

// Router for a flat catalog table (taxes, payment terms): list / get / create / patch / soft delete.
// Role checks (catalogAccess) are applied where the router is mounted.
export function simpleResource({ table, label, listSchema, createSchema, updateSchema, sort, defaultSort, searchColumn }) {
  const router = Router();

  router.get(
    '/',
    validate({ query: listSchema }),
    h(async (req, res) => {
      const f = req.query;
      const w = new Where();
      if (!f.includeInactive) w.add('is_active');
      if (f.search) w.add(`${searchColumn} ilike $?`, `%${f.search}%`);
      const { limit, offset } = pageClause(f);
      const { rows } = await query(
        `select *, count(*) over() as total from ${table} ${w}
          order by ${parseSort(f.sort, sort, defaultSort)} limit ${limit} offset ${offset}`,
        w.params,
      );
      sendList(res, rows.map(({ total, ...r }) => r), {
        page: f.page,
        pageSize: f.pageSize,
        total: rows[0]?.total ?? 0,
      });
    }),
  );

  router.get(
    '/:id',
    validate({ params: idParams }),
    h(async (req, res) => {
      const row = await findRow({ query }, table, req.params.id);
      if (!row) throw new NotFoundError(`${label} not found`);
      sendData(res, row);
    }),
  );

  router.post(
    '/',
    validate({ body: createSchema }),
    h(async (req, res) => {
      sendData(res, await insertRow({ query }, table, { ...req.body, createdBy: req.user.id }), 201);
    }),
  );

  router.patch(
    '/:id',
    validate({ params: idParams, body: updateSchema }),
    h(async (req, res) => {
      const row = await updateRow({ query }, table, req.params.id, req.body);
      if (!row) throw new NotFoundError(`${label} not found`);
      sendData(res, row);
    }),
  );

  router.delete(
    '/:id',
    validate({ params: idParams }),
    h(async (req, res) => {
      const row = await updateRow({ query }, table, req.params.id, { isActive: false });
      if (!row) throw new NotFoundError(`${label} not found`);
      sendData(res, row);
    }),
  );

  return router;
}
