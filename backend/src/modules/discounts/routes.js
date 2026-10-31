import { Router } from 'express';
import { asyncHandler as h, sendData, sendList } from '../../lib/http.js';
import { idParams } from '../../lib/zod.js';
import { validate } from '../../middleware/validate.js';
import * as s from './schemas.js';
import * as service from './service.js';

// Mounted behind catalogAccess: GET for admin and staff, writes for admin only.
const router = Router();

router.get(
  '/',
  validate({ query: s.listDiscountsSchema }),
  h(async (req, res) => {
    const { rows, total } = await service.list(req.query);
    sendList(res, rows, { page: req.query.page, pageSize: req.query.pageSize, total });
  }),
);
router.post(
  '/',
  validate({ body: s.createDiscountSchema }),
  h(async (req, res) => sendData(res, await service.create(req.body, req.user.id), 201)),
);
router.get(
  '/:id',
  validate({ params: idParams }),
  h(async (req, res) => sendData(res, await service.get(req.params.id))),
);
router.patch(
  '/:id',
  validate({ params: idParams, body: s.updateDiscountSchema }),
  h(async (req, res) => sendData(res, await service.update(req.params.id, req.body))),
);
router.delete(
  '/:id',
  validate({ params: idParams }),
  h(async (req, res) => sendData(res, await service.update(req.params.id, { isActive: false }))),
);

export default router;
