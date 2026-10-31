import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { FullPageSpinner, ProtectedRoute, PublicOnlyRoute, RootRedirect } from '@/auth/ProtectedRoute';
import { STAFF_ROLES } from '@/auth/context';
import { AppLayout } from '@/layouts/AppLayout';
import { AuthLayout } from '@/layouts/AuthLayout';
import { PortalLayout } from '@/layouts/PortalLayout';
import { ForbiddenPage, NotFoundPage } from '@/features/errors/ErrorPages';
import { setNavigator } from '@/lib/navigation';

// Every page is its own chunk (route-level lazy loading). Layouts render pages under their own
// <Suspense>; pages outside a layout bring one.
const page = (load) => {
  const Component = lazy(load);
  return <Component />;
};

const standalone = (load) => <Suspense fallback={<FullPageSpinner />}>{page(load)}</Suspense>;

export const routes = [
  { path: '/', element: <RootRedirect /> },
  {
    element: <AuthLayout />,
    children: [
      {
        element: <PublicOnlyRoute />,
        children: [
          { path: '/login', element: page(() => import('@/features/auth/LoginPage')) },
          { path: '/signup', element: page(() => import('@/features/auth/SignupPage')) },
          { path: '/forgot-password', element: page(() => import('@/features/auth/ForgotPasswordPage')) },
        ],
      },
      { path: '/reset-password', element: page(() => import('@/features/auth/ResetPasswordPage')) },
    ],
  },
  {
    path: '/app',
    element: <ProtectedRoute roles={STAFF_ROLES} />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to="/app/dashboard" replace /> },
          { path: 'dashboard', element: page(() => import('@/features/dashboard/DashboardPage')) },

          // Customers
          {
            path: 'customers',
            element: page(() =>
              import('@/features/customers/CustomersPages').then((m) => ({ default: m.CustomersPage }))
            ),
          },
          {
            path: 'customers/:id',
            element: page(() =>
              import('@/features/customers/CustomersPages').then((m) => ({ default: m.CustomerDetailPage }))
            ),
          },

          // Subscriptions
          {
            path: 'subscriptions',
            element: page(() =>
              import('@/features/subscriptions/SubscriptionsPages').then((m) => ({ default: m.SubscriptionsPage }))
            ),
          },
          {
            path: 'subscriptions/new',
            element: page(() =>
              import('@/features/subscriptions/SubscriptionsPages').then((m) => ({ default: m.SubscriptionNewPage }))
            ),
          },
          {
            path: 'subscriptions/:id',
            element: page(() =>
              import('@/features/subscriptions/SubscriptionsPages').then((m) => ({ default: m.SubscriptionDetailPage }))
            ),
          },

          // Templates (reusable quotations)
          {
            path: 'templates',
            element: page(() =>
              import('@/features/settings/SettingsPages').then((m) => ({ default: m.TemplatesPage }))
            ),
          },

          // Billing: invoices, payments, receivables, billing runs
          {
            path: 'invoices',
            element: page(() =>
              import('@/features/billing/BillingPages').then((m) => ({ default: m.InvoicesPage }))
            ),
          },
          {
            path: 'invoices/:id',
            element: page(() =>
              import('@/features/billing/BillingPages').then((m) => ({ default: m.InvoiceDetailPage }))
            ),
          },
          {
            path: 'payments',
            element: page(() =>
              import('@/features/billing/BillingPages').then((m) => ({ default: m.PaymentsPage }))
            ),
          },
          {
            path: 'receivables',
            element: page(() =>
              import('@/features/billing/BillingPages').then((m) => ({ default: m.ReceivablesPage }))
            ),
          },
          {
            path: 'billing',
            element: page(() =>
              import('@/features/billing/BillingPages').then((m) => ({ default: m.BillingRunsPage }))
            ),
          },

          // Catalog
          {
            path: 'catalog/products',
            element: page(() =>
              import('@/features/catalog/CatalogPages').then((m) => ({ default: m.ProductsPage }))
            ),
          },
          {
            path: 'catalog/attributes',
            element: page(() =>
              import('@/features/catalog/CatalogPages').then((m) => ({ default: m.AttributesPage }))
            ),
          },
          {
            path: 'catalog/plans',
            element: page(() =>
              import('@/features/catalog/CatalogPages').then((m) => ({ default: m.PlansPage }))
            ),
          },
          {
            path: 'discounts',
            element: page(() =>
              import('@/features/catalog/CatalogPages').then((m) => ({ default: m.DiscountsPage }))
            ),
          },

          // Settings
          {
            path: 'settings/taxes',
            element: page(() =>
              import('@/features/catalog/CatalogPages').then((m) => ({ default: m.TaxesPage }))
            ),
          },
          {
            path: 'settings/payment-terms',
            element: page(() =>
              import('@/features/catalog/CatalogPages').then((m) => ({ default: m.PaymentTermsPage }))
            ),
          },
          {
            path: 'settings/company',
            element: page(() =>
              import('@/features/settings/SettingsPages').then((m) => ({ default: m.CompanyPage }))
            ),
          },

          // Users (admin-only actions enforced at API level)
          {
            path: 'users',
            element: page(() =>
              import('@/features/catalog/CatalogPages').then((m) => ({ default: m.UsersPage }))
            ),
          },
        ],
      },
    ],
  },
  {
    path: '/portal',
    element: <ProtectedRoute roles={['customer']} />,
    children: [
      {
        element: <PortalLayout />,
        children: [
          {
            index: true,
            element: page(() =>
              import('@/features/portal/PortalPages').then((m) => ({ default: m.PortalOverviewPage }))
            ),
          },
          {
            path: 'subscriptions',
            element: page(() =>
              import('@/features/portal/PortalPages').then((m) => ({ default: m.PortalSubscriptionsPage }))
            ),
          },
          {
            path: 'subscriptions/:id',
            element: page(() =>
              import('@/features/portal/PortalPages').then((m) => ({ default: m.PortalSubscriptionDetailPage }))
            ),
          },
          {
            path: 'invoices',
            element: page(() =>
              import('@/features/portal/PortalPages').then((m) => ({ default: m.PortalInvoicesPage }))
            ),
          },
          {
            path: 'invoices/:id',
            element: page(() =>
              import('@/features/portal/PortalPages').then((m) => ({ default: m.PortalInvoiceDetailPage }))
            ),
          },
          {
            path: 'payments',
            element: page(() =>
              import('@/features/portal/PortalPages').then((m) => ({ default: m.PortalPaymentsPage }))
            ),
          },
          {
            path: 'profile',
            element: page(() =>
              import('@/features/portal/PortalPages').then((m) => ({ default: m.PortalProfilePage }))
            ),
          },
        ],
      },
    ],
  },
  { path: '/status', element: standalone(() => import('@/features/status/StatusPage')) },
  { path: '/design-system', element: standalone(() => import('@/pages/design-system/DesignSystemPage')) },
  { path: '/403', element: <ForbiddenPage /> },
  { path: '*', element: <NotFoundPage /> },
];

export function createRouter() {
  const router = createBrowserRouter(routes);
  setNavigator((to, options) => router.navigate(to, options));
  return router;
}
