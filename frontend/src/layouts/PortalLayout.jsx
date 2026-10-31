import { Suspense, useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/auth/context';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/app/states';
import { cn } from '@/lib/utils';
import { PORTAL_NAV } from './nav';

/** The customer's side: a calm top nav and a narrow column, more product than back office. */
export function PortalLayout() {
  const { user, signOut } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/portal"
            className="rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Logo />
          </Link>
          <span aria-hidden="true" className="hidden h-4 w-px bg-border sm:block" />
          <span className="hidden type-label text-muted-foreground sm:inline">My account</span>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle className="hidden sm:inline-flex" />
            <span className="hidden items-center gap-2 sm:flex">
              <Avatar name={user?.fullName || user?.email || '?'} size="sm" />
              <span className="max-w-40 truncate text-[0.8125rem] font-medium">{user?.fullName}</span>
            </span>
            <Button variant="tertiary" size="sm" onClick={() => signOut({ redirect: '/login' })}>
              <LogOut /> Sign out
            </Button>
          </div>
        </div>
        <nav aria-label="Account" className="border-t">
          <ul className="mx-auto flex w-full max-w-5xl gap-5 overflow-x-auto px-4 sm:px-6">
            {PORTAL_NAV.map(({ label, to, end }) => (
              <li key={to} className="shrink-0">
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      '-mb-px flex h-11 items-center border-b-2 text-[0.8125rem] font-medium outline-none transition-colors',
                      'focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ring',
                      isActive
                        ? 'border-accent text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 outline-none sm:px-6 sm:py-10">
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap justify-between gap-2 px-4 py-5 type-caption text-muted-foreground sm:px-6">
          <span>Brightloop Subscriptions</span>
          <span>Questions about a bill? Reply to any invoice email.</span>
        </div>
      </footer>
    </div>
  );
}
