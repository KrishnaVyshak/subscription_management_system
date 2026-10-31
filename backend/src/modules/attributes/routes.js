import { Router } from 'express';
import { asyncHandler as h, sendData } from '../../lib/http.js';
import { idParams } from '../../lib/zod.js';
import { validate } from '../../middleware/validate.js';
import * as s from './schemas.js';
import * as service from './service.js';

const router = Router();

router.get(
  '/',
  validate({ query: s.listAttributesSchema }),
  h(async (req, res) => sendData(res, await service.list(req.query))),
);
router.post(
  '/',
  validate({ body: s.createAttributeSchema }),
  h(async (req, res) => sendData(res, await service.create(req.body, req.user.id), 201)),
);
router.get(
  '/:id',
  validate({ params: idParams }),
  h(async (req, res) => sendData(res, await service.get(req.params.id))),
);
router.patch(
  '/:id',
  validate({ params: idParams, body: s.updateAttributeSchema }),
  h(async (req, res) => sendData(res, await service.update(req.params.id, req.body))),
);
router.post(
  '/:id/values',
  validate({ params: idParams, body: s.createValueSchema }),
  h(async (req, res) => sendData(res, await service.addValue(req.params.id, req.body), 201)),
);

export default router;
