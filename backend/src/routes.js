import { Router } from 'express';
import { authenticate } from './middleware/auth.js';
import healthRoutes from './modules/health/routes.js';
import authRoutes from './modules/auth/routes.js';
import usersRoutes from './modules/users/routes.js';

// Every router except health and auth (which guards its own routes) sits behind authenticate.
// Each module applies its own role checks.
export function apiRouter() {
  const api = Router();

  api.use('/health', healthRoutes);
  api.use('/auth', authRoutes);

  const authed = {
    '/users': usersRoutes,
  };
  for (const [prefix, router] of Object.entries(authed)) {
    api.use(prefix, authenticate, router);
  }

  return api;
}
