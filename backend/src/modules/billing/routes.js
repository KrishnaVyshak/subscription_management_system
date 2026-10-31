import { Router } from 'express';
import { z } from 'zod';
import { todayIST } from '../../lib/dates.js';
import { asyncHandler as h, listQuerySchema, sendData, sendList } from '../../lib/http.js';
import { idParams, isoDate } from '../../lib/zod.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as service from './service.js';

const router = Router();

router.post(
  '/run',
  requireRole('admin'),
  validate({ body: z.object({ asOfDate: isoDate.optional() }) }),
  h(async (req, res) => {
    const asOfDate = req.body.asOfDate ?? todayIST();
    service.assertRunDate(asOfDate);
    sendData(res, await service.runBilling({ asOfDate, triggeredBy: req.user.id }), 201);
  }),
);

router.get(
  '/runs',
  requireRole('admin', 'staff'),
  validate({ query: listQuerySchema }),
  h(async (req, res) => {
    const { rows, total } = await service.listRuns(req.query);
    sendList(res, rows, { page: req.query.page, pageSize: req.query.pageSize, total });
  }),
);

router.get(
  '/runs/:id',
  requireRole('admin', 'staff'),
  validate({ params: idParams }),
  h(async (req, res) => sendData(res, await service.getRun(req.params.id))),
);

export default router;
