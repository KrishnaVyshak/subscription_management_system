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
        children: [],
      },
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
        children: [{ index: true, element: page(() => import('@/features/portal/PortalOverviewPage')) }],
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
