import { Suspense } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Spinner } from '@/components/ui/spinner';

/** Sign-in pages: one sheet on the canvas, opened by the heavy rule. */
export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/login"
            className="rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          >
            <Logo />
          </Link>
          <ThemeToggle className="ml-auto" />
        </div>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">
          <Suspense
            fallback={
              <div className="grid h-60 place-items-center text-muted-foreground">
                <Spinner className="size-5" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>
      <footer className="border-t">
        <p className="mx-auto w-full max-w-5xl px-4 py-5 type-caption text-muted-foreground sm:px-6">
          Brightloop Subscriptions · billing kept in order
        </p>
      </footer>
    </div>
  );
}

/** The sheet each auth page sits on. */
export function AuthCard({ eyebrow, title, description, children, footer }) {
  return (
    <section className="rounded-lg border bg-card">
      <header className="border-b px-5 pt-5 pb-4 sm:px-6">
        {eyebrow && <p className="type-label text-muted-foreground">{eyebrow}</p>}
        <h1 className="mt-2 type-h1">{title}</h1>
        {description && <p className="mt-1.5 text-[0.8125rem] text-muted-foreground">{description}</p>}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
      {footer && <footer className="border-t bg-sunken/50 px-5 py-3 text-[0.8125rem] sm:px-6">{footer}</footer>}
    </section>
  );
}
