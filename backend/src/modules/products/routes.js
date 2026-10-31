import { Router } from 'express';
import { asyncHandler as h } from '../../lib/http.js';
import { idParams } from '../../lib/zod.js';
import { validate } from '../../middleware/validate.js';
import * as c from './controller.js';
import * as s from './schemas.js';

const router = Router();

router.get('/', validate({ query: s.listProductsSchema }), h(c.list));
router.post('/', validate({ body: s.createProductSchema }), h(c.create));
router.get('/:id', validate({ params: idParams }), h(c.get));
router.patch('/:id', validate({ params: idParams, body: s.updateProductSchema }), h(c.update));
router.delete('/:id', validate({ params: idParams }), h(c.remove));
router.put('/:id/taxes', validate({ params: idParams, body: s.setTaxesSchema }), h(c.setTaxes));
router.post(
  '/:id/variants',
  validate({ params: idParams, body: s.createVariantSchema }),
  h(c.createVariant),
);
router.patch(
  '/:id/variants/:variantId',
  validate({ params: s.variantParams, body: s.updateVariantSchema }),
  h(c.updateVariant),
);

export default router;
