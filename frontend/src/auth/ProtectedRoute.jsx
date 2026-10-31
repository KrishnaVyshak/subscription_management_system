import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { errorMessage } from '@/lib/errors';
import { loginPath } from '@/lib/navigation';
import { homeFor, safeNext, useAuth } from './context';

export function FullPageSpinner() {
  return (
    <div className="grid min-h-screen place-items-center text-muted-foreground">
      <Spinner className="size-5" />
    </div>
  );
}

function ProfileError({ error, onRetry, onSignOut }) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <Alert
        tone="danger"
        title="We couldn't load your account"
        className="max-w-md"
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="tertiary" onClick={onSignOut}>
              Sign out
            </Button>
            <Button size="sm" variant="secondary" onClick={onRetry}>
              Try again
            </Button>
          </div>
        }
      >
        {errorMessage(error)}
      </Alert>
    </div>
  );
}

/** Signed-in users only; `roles` limits which roles may enter (others see /403). */
export function ProtectedRoute({ roles }) {
  const { session, role, loading, error, refreshMe, signOut } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  if (error && !role) {
    return (
      <ProfileError
        error={error}
        onRetry={() => refreshMe().catch(() => {})}
        onSignOut={() => signOut({ redirect: '/login' })}
      />
    );
  }
  if (roles && !roles.includes(role)) return <Navigate to="/403" replace />;
  return <Outlet />;
}

/** Login, signup and forgot-password: signed-in users go to their home (or `next`). */
export function PublicOnlyRoute() {
  const { session, role, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullPageSpinner />;
  if (session && role) {
    const next = new URLSearchParams(location.search).get('next');
    return <Navigate to={safeNext(next, role) ?? homeFor(role)} replace />;
  }
  return <Outlet />;
}

/** `/`: send each role home. */
export function RootRedirect() {
  const { session, role, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!session || !role) return <Navigate to="/login" replace />;
  return <Navigate to={homeFor(role)} replace />;
}

/** Hides UI from roles that can't use it. The API is what actually enforces access. */
export function RoleGate({ roles, fallback = null, children }) {
  const { role } = useAuth();
  return roles.includes(role) ? children : fallback;
}
