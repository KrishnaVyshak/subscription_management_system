import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A row of key figures on one sheet, separated by hairlines rather than boxed one by one.
 * Set the column template with className (e.g. `@4xl:grid-cols-[1.4fr_1fr_1fr_1fr]`).
 */
export function MetricStrip({ className, children }) {
  return (
    <dl
      className={cn(
        'grid gap-px overflow-hidden rounded-lg border bg-border [&>*]:bg-card',
        className,
      )}
    >
      {children}
    </dl>
  );
}

/**
 * One figure. `delta` is a percentage change; set `invert` for metrics where down is good (churn).
 * Direction is carried by arrow + hidden text, never by colour alone.
 * `featured` sets the figure larger and marks it: use it for the one number a screen is about.
 */
export function Metric({
  label,
  value,
  delta,
  deltaLabel = 'vs last month',
  invert = false,
  featured = false,
  className,
}) {
  const up = delta >= 0;
  const good = invert ? !up : up;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  return (
    <div className={cn('flex flex-col px-4 py-4 sm:px-5', className)}>
      <dt className="flex items-center gap-2 type-label text-muted-foreground">
        {featured && <span aria-hidden="true" className="size-1.5 bg-accent" />}
        {label}
      </dt>
      <dd className={cn('mt-auto pt-4', featured ? 'type-figure-lg' : 'type-figure')}>{value}</dd>
      {delta !== undefined && (
        <dd className="mt-2 flex flex-wrap items-center gap-x-2 type-caption">
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
          <span className="text-muted-foreground">{deltaLabel}</span>
        </dd>
      )}
    </div>
  );
}
