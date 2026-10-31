import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export { MetricStrip } from '@/components/ui/metric';

/**
 * One figure inside a MetricStrip (same look as the kit's Metric), optionally linking to the
 * filtered list behind it. The whole cell is the link target.
 */
export function KpiCard({ label, value, hint, delta, invert = false, to, featured = false, loading = false, tone }) {
  const up = delta >= 0;
  const good = invert ? !up : up;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  return (
    <div className={cn('group relative flex flex-col px-4 py-4 sm:px-5', to && 'transition-colors hover:bg-sunken/50')}>
      <dt className="flex items-center gap-2 type-label text-muted-foreground">
        {featured && <span aria-hidden="true" className="size-1.5 bg-accent" />}
        {tone === 'danger' && <span aria-hidden="true" className="size-1.5 bg-danger" />}
        {label}
        {to && (
          <ChevronRight
            aria-hidden="true"
            className="ml-auto size-3.5 text-subtle-foreground transition-transform group-hover:translate-x-0.5"
          />
        )}
      </dt>
      <dd className={cn('mt-auto pt-4', featured ? 'type-figure-lg' : 'type-figure')}>
        {loading ? <Skeleton className="h-7 w-28" /> : value}
      </dd>
      {(hint || delta !== undefined) && !loading && (
        <dd className="mt-2 flex flex-wrap items-center gap-x-2 type-caption text-muted-foreground">
          {delta !== undefined && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 font-mono font-medium tabular-nums',
                good ? 'text-success-soft-foreground' : 'text-danger-soft-foreground',
              )}
            >
              <Arrow aria-hidden="true" className="size-3.5" />
              <span className="sr-only">{up ? 'Up' : 'Down'}</span>
              {Math.abs(delta).toFixed(1)}%
            </span>
          )}
          {hint}
        </dd>
      )}
      {to && (
        <Link
          to={to}
          className="absolute inset-0 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
        >
          <span className="sr-only">View {label}</span>
        </Link>
      )}
    </div>
  );
}
