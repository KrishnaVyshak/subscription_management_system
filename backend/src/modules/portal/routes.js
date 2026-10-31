import { Router } from 'express';
import { z } from 'zod';
import { ForbiddenError } from '../../lib/errors.js';
import { asyncHandler as h, sendData, sendList } from '../../lib/http.js';
import { idParams } from '../../lib/zod.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { sendPdf } from '../invoices/controller.js';
import { listInvoicesSchema } from '../invoices/schemas.js';
import { listPaymentsSchema } from '../payments/schemas.js';
import { addonInput, listSubscriptionsSchema } from '../subscriptions/schemas.js';
import * as service from './service.js';

const router = Router();

router.use(requireRole('customer'), (req, _res, next) => {
  if (!req.user.customerId) return next(new ForbiddenError('No customer account is linked to this login'));
  next();
});

const noteBody = z.object({ note: z.string().trim().max(1000).optional() });
const addonsBody = z
  .object({ add: z.array(addonInput).default([]), remove: z.array(z.uuid()).default([]) })
  .refine((v) => v.add.length || v.remove.length, 'Nothing to change');
const profileBody = z
  .object({
    fullName: z.string().trim().min(1).max(200),
    name: z.string().trim().min(1).max(200),
    phone: z.string().trim().max(30).nullable(),
    billingAddress: z.string().trim().max(1000).nullable(),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[0-9A-Z]{15}$/, 'GSTIN has 15 letters/digits')
      .nullable(),
  })
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'Nothing to update');

const list = (fn) =>
  h(async (req, res) => {
    const { rows, total, ...meta } = await fn(req.user, req.query);
    sendList(res, rows, { page: req.query.page, pageSize: req.query.pageSize, total }, meta);
  });

router.get('/overview', h(async (req, res) => sendData(res, await service.overview(req.user))));

router.get('/subscriptions', validate({ query: listSubscriptionsSchema }), list(service.listSubscriptions));
router.get(
  '/subscriptions/:id',
  validate({ params: idParams }),
  h(async (req, res) => sendData(res, await service.getSubscription(req.user, req.params.id))),
);
for (const action of ['pause', 'resume', 'cancel']) {
  router.post(
    `/subscriptions/:id/${action}`,
    validate({ params: idParams, body: noteBody }),
    h(async (req, res) => sendData(res, await service[action](req.user, req.params.id, req.body.note))),
  );
}
router.post(
  '/subscriptions/:id/renew',
  validate({ params: idParams }),
  h(async (req, res) => sendData(res, await service.renew(req.user, req.params.id))),
);
router.post(
  '/subscriptions/:id/addons',
  validate({ params: idParams, body: addonsBody }),
  h(async (req, res) => sendData(res, await service.addons(req.user, req.params.id, req.body))),
);

router.get('/invoices', validate({ query: listInvoicesSchema }), list(service.listInvoices));
router.get(
  '/invoices/:id',
  validate({ params: idParams }),
  h(async (req, res) => sendData(res, await service.getInvoice(req.user, req.params.id))),
);
router.get(
  '/invoices/:id/pdf',
  validate({ params: idParams }),
  h(async (req, res) => {
    const { buffer, fileName } = await service.invoicePdf(req.user, req.params.id);
    sendPdf(res, buffer, fileName);
  }),
);

router.get('/payments', validate({ query: listPaymentsSchema }), list(service.listPayments));

router.get('/profile', h(async (req, res) => sendData(res, await service.getProfile(req.user))));
router.patch(
  '/profile',
  validate({ body: profileBody }),
  h(async (req, res) => sendData(res, await service.updateProfile(req.user, req.body))),
);

export default router;
