import { Router } from 'express';
import { z } from 'zod';
import { todayIST } from '../lib/dates.js';
import { asyncHandler as h, sendData } from '../lib/http.js';
import { isoDate } from '../lib/zod.js';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { assertRunDate } from '../modules/billing/service.js';
import { JOBS, runDailyJobs } from './daily.js';

const router = Router();

// POST /api/jobs/:name/run — admin trigger for demos. `daily` runs all five in order.
router.post(
  '/:name/run',
  requireRole('admin'),
  validate({
    params: z.object({ name: z.enum(['daily', ...Object.keys(JOBS)]) }),
    body: z.object({ asOfDate: isoDate.optional() }),
  }),
  h(async (req, res) => {
    const asOfDate = req.body.asOfDate ?? todayIST();
    assertRunDate(asOfDate);
    const result =
      req.params.name === 'daily'
        ? await runDailyJobs(asOfDate, req.user.id)
        : { asOfDate, results: { [req.params.name]: await JOBS[req.params.name](asOfDate, req.user.id) } };
    sendData(res, result);
  }),
);

export default router;
