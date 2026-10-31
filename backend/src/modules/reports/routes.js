import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler as h, sendData } from '../../lib/http.js';
import { isoDate } from '../../lib/zod.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as service from './service.js';

const filters = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    planId: z.uuid().optional(),
    customerId: z.uuid().optional(),
  })
  .refine((v) => !v.from || !v.to || v.from <= v.to, { message: 'from must be on or before to', path: ['to'] });

const router = Router();

router.use(requireRole('admin', 'staff'));
router.get(
  '/summary',
  validate({ query: filters }),
  h(async (req, res) => sendData(res, await service.summary(req.query))),
);
router.get(
  '/revenue-trend',
  validate({ query: z.object({ months: z.coerce.number().int().min(1).max(60).default(12), planId: z.uuid().optional(), customerId: z.uuid().optional() }) }),
  h(async (req, res) => sendData(res, await service.revenueTrend(req.query))),
);
router.get(
  '/by-plan',
  validate({ query: filters }),
  h(async (req, res) => sendData(res, await service.byPlan(req.query))),
);
router.get(
  '/top-customers',
  validate({
    query: z.intersection(filters, z.object({ limit: z.coerce.number().int().min(1).max(100).default(10) })),
  }),
  h(async (req, res) => sendData(res, await service.topCustomers(req.query))),
);

export default router;
