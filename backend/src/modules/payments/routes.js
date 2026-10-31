import { Router } from 'express';
import { asyncHandler as h, sendData, sendList } from '../../lib/http.js';
import { idParams } from '../../lib/zod.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { listPaymentsSchema } from './schemas.js';
import * as service from './service.js';

const router = Router();

router.get(
  '/',
  requireRole('admin', 'staff'),
  validate({ query: listPaymentsSchema }),
  h(async (req, res) => {
    const { rows, total, totalAmount } = await service.list(req.query);
    sendList(res, rows, { page: req.query.page, pageSize: req.query.pageSize, total }, { totalAmount });
  }),
);

router.delete(
  '/:id',
  requireRole('admin'),
  validate({ params: idParams }),
  h(async (req, res) => sendData(res, await service.remove(req.params.id))),
);

export default router;
