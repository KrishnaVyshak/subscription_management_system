import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/auth/context';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PageSkeleton } from '@/components/app/states';
import { ROLE_LABELS } from '@/lib/format';
import { cn } from '@/lib/utils';
import { GlobalSearch } from './GlobalSearch';
import { APP_NAV, findNav } from './nav';

function SideNav({ role, onNavigate }) {
  return (
    <nav aria-label="Main" className="space-y-5 px-2 py-4">
      {APP_NAV.map(({ group, items }) => {
        const visible = items.filter((i) => !i.roles || i.roles.includes(role));
        if (!visible.length) return null;
        return (
          <div key={group}>
            <p className="px-2.5 type-label text-subtle-foreground">{group}</p>
            <ul className="mt-1.5 space-y-px">
              {visible.map(({ label, to, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[0.8125rem] outline-none transition-colors duration-75',
                        'focus-visible:outline-2 focus-visible:outline-ring',
                        isActive
                          ? 'bg-sunken font-medium text-foreground before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:bg-accent'
                          : 'text-muted-foreground hover:bg-sunken/60 hover:text-foreground',
                      )
                    }
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function UserCard({ user, role }) {
  return (
    <div className="flex items-center gap-2.5 border-t px-4 py-3">
      <Avatar name={user?.fullName || user?.email || '?'} size="sm" />
      <div className="min-w-0 text-xs leading-4">
        <p className="truncate font-medium">{user?.fullName || user?.email}</p>
        <p className="text-muted-foreground">{ROLE_LABELS[role]}</p>
      </div>
    </div>
  );
}

/** Below md the rail becomes a drawer (native <dialog>: focus trap and Esc for free). */
function MobileDrawer({ open, onClose, role, user }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal?.();
    if (!open && el.open) el.close?.();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label="Navigation"
      className="m-0 h-full max-h-none w-64 max-w-[85vw] border-r bg-card p-0 text-foreground backdrop:bg-stone-950/45 open:flex open:flex-col open:animate-fade-in"
    >
      <div className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <Logo />
        <Button variant="tertiary" size="icon-sm" aria-label="Close navigation" onClick={onClose}>
          <X />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SideNav role={role} onNavigate={onClose} />
      </div>
      <div className="flex justify-center border-t py-2">
        <ThemeToggle />
      </div>
      <UserCard user={user} role={role} />
    </dialog>
  );
}

export function AppLayout() {
  const { user, role, signOut } = useAuth();
  const { pathname } = useLocation();
  const [drawer, setDrawer] = useState(false);
  const current = findNav(pathname);
  const mainRef = useRef(null);

  // New page: start at the top.
  useEffect(() => {
    mainRef.current?.scrollTo?.(0, 0);
    window.scrollTo?.(0, 0);
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-12 shrink-0 items-center border-b px-4">
          <Link
            to="/app/dashboard"
            className="rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SideNav role={role} />
        </div>
        <UserCard user={user} role={role} />
      </aside>

      <MobileDrawer open={drawer} onClose={() => setDrawer(false)} role={role} user={user} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-card px-3 sm:gap-3 sm:px-4">
          <Button
            variant="tertiary"
            size="icon"
            aria-label="Open navigation"
            className="md:hidden"
            onClick={() => setDrawer(true)}
          >
            <Menu />
          </Button>
          {current && (
            <p className="hidden shrink-0 text-[0.8125rem] text-muted-foreground lg:block">
              {current.group} <span className="px-1 text-subtle-foreground">/</span>
              <span className="text-foreground">{current.item.label}</span>
            </p>
          )}
          <GlobalSearch className="max-w-80 min-w-0 flex-1 lg:ml-6" />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle className="hidden lg:inline-flex" />
            <span className="hidden max-w-40 truncate text-[0.8125rem] font-medium sm:inline">
              {user?.fullName || user?.email}
            </span>
            <Badge tone={role === 'admin' ? 'ink' : 'neutral'}>{ROLE_LABELS[role]}</Badge>
            <Button variant="tertiary" size="sm" onClick={() => signOut({ redirect: '/login' })}>
              <LogOut /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </header>

        <main id="main" ref={mainRef} tabIndex={-1} className="@container min-h-0 w-full flex-1 overflow-y-auto p-3 outline-none sm:p-5 lg:p-6">
          <div className="mx-auto max-w-[90rem]">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
