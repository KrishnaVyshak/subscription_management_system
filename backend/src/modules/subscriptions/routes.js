import { Router } from 'express';
import { asyncHandler as h } from '../../lib/http.js';
import { idParams } from '../../lib/zod.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as c from './controller.js';
import * as s from './schemas.js';
import { attachSchema, detachParams } from '../discounts/schemas.js';

const router = Router();

router.use(requireRole('admin', 'staff'));
router.get('/', validate({ query: s.listSubscriptionsSchema }), h(c.list));
router.post('/', validate({ body: s.createSubscriptionSchema }), h(c.create));
router.get('/:id', validate({ params: idParams }), h(c.get));
router.patch('/:id', validate({ params: idParams, body: s.updateSubscriptionSchema }), h(c.update));
router.post(
  '/:id/transition',
  validate({ params: idParams, body: s.transitionSchema }),
  h(c.transition),
);
router.post('/:id/renew', validate({ params: idParams }), h(c.renew));
router.post('/:id/invoices', validate({ params: idParams }), h(c.invoiceNow));
// Discounts are admin-only rules, so attaching them is too.
router.post(
  '/:id/discounts',
  requireRole('admin'),
  validate({ params: idParams, body: attachSchema }),
  h(c.attachDiscount),
);
router.delete(
  '/:id/discounts/:discountId',
  requireRole('admin'),
  validate({ params: detachParams }),
  h(c.detachDiscount),
);

export default router;
