import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/**
 * Title, breadcrumb and the page's actions (one primary at most).
 * crumbs: [{ label, to? }]; the page title is the last crumb and isn't repeated.
 */
export function PageHeader({ title, description, crumbs = [], actions, meta, className }) {
  return (
    <header
      className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-3 pb-1', className)}
    >
      <div className="min-w-0">
        {crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-1.5">
            <ol className="flex flex-wrap items-center text-[0.8125rem] text-muted-foreground">
              {crumbs.map((c, i) => (
                <Fragment key={`${c.label}-${i}`}>
                  {i > 0 && (
                    <li aria-hidden="true" className="px-1.5 text-subtle-foreground">
                      /
                    </li>
                  )}
                  <li>
                    {c.to ? (
                      <Link
                        to={c.to}
                        className="rounded-sm outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {c.label}
                      </Link>
                    ) : (
                      c.label
                    )}
                  </li>
                </Fragment>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="flex flex-wrap items-center gap-x-3 gap-y-1 type-h1 break-words">{title}</h1>
        {description && (
          <p className="mt-1 text-[0.8125rem] text-muted-foreground">{description}</p>
        )}
      </div>
      {(actions || meta) && (
        <div className="flex flex-wrap items-center gap-2">
          {meta && <span className="font-mono text-xs text-muted-foreground">{meta}</span>}
          {actions}
        </div>
      )}
    </header>
  );
}

/** Page body: consistent vertical rhythm. */
export function Page({ className, children }) {
  return <div className={cn('space-y-5', className)}>{children}</div>;
}
