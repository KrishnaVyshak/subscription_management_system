import { Link } from 'react-router-dom';
import { FileQuestion, ShieldAlert } from 'lucide-react';
import { homeFor, useAuth } from '@/auth/context';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

function Shell({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-20">
        {children}
      </main>
    </div>
  );
}

function HomeButton() {
  const { session, role } = useAuth();
  return session && role ? (
    <Button as={Link} to={homeFor(role)}>
      Go to {role === 'customer' ? 'my account' : 'the dashboard'}
    </Button>
  ) : (
    <Button as={Link} to="/login">
      Sign in
    </Button>
  );
}

export function ForbiddenPage() {
  return (
    <Shell>
      <h1 className="font-mono text-sm text-subtle-foreground">403 · Forbidden</h1>
      <EmptyState
        className="mt-3"
        icon={ShieldAlert}
        title="You don't have access to this page"
        description="Your role can't open it. If you think that's wrong, ask an administrator."
        action={<HomeButton />}
      />
    </Shell>
  );
}

export function NotFoundPage() {
  return (
    <Shell>
      <h1 className="font-mono text-sm text-subtle-foreground">404 · Not found</h1>
      <EmptyState
        className="mt-3"
        icon={FileQuestion}
        title="Page not found"
        description="The address may be mistyped, or the page has moved."
        action={<HomeButton />}
      />
    </Shell>
  );
}
