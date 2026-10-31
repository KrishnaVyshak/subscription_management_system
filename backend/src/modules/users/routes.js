import { Router } from 'express';
import { asyncHandler as h } from '../../lib/http.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as c from './controller.js';
import { createStaffSchema, idParams, listUsersSchema, updateUserSchema } from './schemas.js';

const router = Router();

router.use(requireRole('admin'));
router.get('/', validate({ query: listUsersSchema }), h(c.list));
router.post('/staff', validate({ body: createStaffSchema }), h(c.createStaff));
router.patch('/:id', validate({ params: idParams, body: updateUserSchema }), h(c.update));

export default router;
