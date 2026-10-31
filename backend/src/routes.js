import { Router } from 'express';
import { authenticate, catalogAccess } from './middleware/auth.js';
import healthRoutes from './modules/health/routes.js';
import authRoutes from './modules/auth/routes.js';
import usersRoutes from './modules/users/routes.js';
import productsRoutes from './modules/products/routes.js';
import attributesRoutes from './modules/attributes/routes.js';
import plansRoutes from './modules/plans/routes.js';
import taxesRoutes from './modules/taxes/routes.js';
import paymentTermsRoutes from './modules/paymentTerms/routes.js';
import settingsRoutes from './modules/settings/routes.js';
import templatesRoutes from './modules/templates/routes.js';
import customersRoutes from './modules/customers/routes.js';
import subscriptionsRoutes from './modules/subscriptions/routes.js';
import invoicesRoutes from './modules/invoices/routes.js';
import billingRoutes from './modules/billing/routes.js';
import discountsRoutes from './modules/discounts/routes.js';
import paymentsRoutes from './modules/payments/routes.js';
import receivablesRoutes from './modules/receivables/routes.js';

// Every router except health and auth (which guards its own routes) sits behind authenticate.
// Each module applies its own role checks.
export function apiRouter() {
  const api = Router();

  api.use('/health', healthRoutes);
  api.use('/auth', authRoutes);

  const authed = {
    '/users': usersRoutes,
    '/customers': customersRoutes,
    '/subscriptions': subscriptionsRoutes,
    '/invoices': invoicesRoutes,
    '/billing': billingRoutes,
    '/payments': paymentsRoutes,
    '/receivables': receivablesRoutes,
  };
  for (const [prefix, router] of Object.entries(authed)) {
    api.use(prefix, authenticate, router);
  }

  // Catalog: GET for admin and staff, writes for admin only.
  const catalog = {
    '/products': productsRoutes,
    '/attributes': attributesRoutes,
    '/plans': plansRoutes,
    '/taxes': taxesRoutes,
    '/payment-terms': paymentTermsRoutes,
    '/settings': settingsRoutes,
    '/templates': templatesRoutes,
    '/discounts': discountsRoutes,
  };
  for (const [prefix, router] of Object.entries(catalog)) {
    api.use(prefix, authenticate, catalogAccess, router);
  }

  return api;
}
