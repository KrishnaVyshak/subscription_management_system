import { Router } from 'express';
import { asyncHandler as h } from '../../lib/http.js';
import { idParams } from '../../lib/zod.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as c from './controller.js';
import * as s from './schemas.js';

const router = Router();

router.use(requireRole('admin', 'staff'));
router.get('/', validate({ query: s.listCustomersSchema }), h(c.list));
router.post('/', validate({ body: s.createCustomerSchema }), h(c.create));
router.get('/:id', validate({ params: idParams }), h(c.get));
router.patch('/:id', validate({ params: idParams, body: s.updateCustomerSchema }), h(c.update));
router.post('/:id/invite', validate({ params: idParams }), h(c.invite));

export default router;
