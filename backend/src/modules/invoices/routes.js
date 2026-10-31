import { Router } from 'express';
import { asyncHandler as h } from '../../lib/http.js';
import { idParams } from '../../lib/zod.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as c from './controller.js';
import { listInvoicesSchema } from './schemas.js';
import { recordPaymentSchema } from '../payments/schemas.js';

const router = Router();

router.use(requireRole('admin', 'staff'));
router.get('/', validate({ query: listInvoicesSchema }), h(c.list));
router.get('/:id', validate({ params: idParams }), h(c.get));
router.post('/:id/confirm', validate({ params: idParams }), h(c.confirm));
router.post('/:id/cancel', validate({ params: idParams }), h(c.cancel));
router.post(
  '/:id/payments',
  validate({ params: idParams, body: recordPaymentSchema }),
  h(c.recordPayment),
);

export default router;
