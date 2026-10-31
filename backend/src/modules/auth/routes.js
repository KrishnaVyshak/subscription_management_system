import { Router } from 'express';
import { asyncHandler as h } from '../../lib/http.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as c from './controller.js';
import { changePasswordSchema, signupSchema, updateMeSchema } from './schemas.js';

const router = Router();

router.post('/signup', validate({ body: signupSchema }), h(c.signup));
router.get('/me', authenticate, h(c.me));
router.patch('/me', authenticate, validate({ body: updateMeSchema }), h(c.updateMe));
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  h(c.changePassword),
);

export default router;
