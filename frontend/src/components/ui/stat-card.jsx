import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { LoopPattern } from '@/components/brand/loop-pattern';
import { cn } from '@/lib/utils';
import { Card } from './card';

/**
 * KPI tile. `delta` is a percentage change; set `invert` for metrics where down is good (churn).
 * Direction is carried by arrow + hidden text, never by colour alone.
 * `featured` renders the Ink brand tile; use it for the one number a screen is about.
 */
export function StatCard({
  label,
  value,
  delta,
  deltaLabel = 'vs last month',
  invert = false,
  featured = false,
  icon: Icon,
  className,
}) {
  const up = delta >= 0;
  const good = invert ? !up : up;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  return (
    <Card
      className={cn(
        'relative overflow-hidden p-5',
        featured &&
          'border-sidebar-border bg-sidebar text-white dark:border-tide-700/60 dark:bg-linear-to-br dark:from-tide-800 dark:to-sidebar',
        className,
      )}
    >
      {featured && (
        <LoopPattern rings={5} className="absolute -top-16 -right-16 size-56 text-white/10" />
      )}
      <div className="relative flex items-center justify-between gap-3">
        <p
          className={cn(
            'text-sm font-medium',
            featured ? 'text-white/70' : 'text-muted-foreground',
          )}
        >
          {label}
        </p>
        {Icon && (
          <Icon
            aria-hidden="true"
            className={cn('size-4', featured ? 'text-volt-300' : 'text-muted-foreground')}
          />
        )}
      </div>
      <p className="relative mt-5 type-figure">{value}</p>
      {delta !== undefined && (
        <p className="relative mt-3 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 font-semibold tabular-nums',
              featured
                ? 'text-volt-300'
                : good
                  ? 'text-success-soft-foreground'
                  : 'text-danger-soft-foreground',
            )}
          >
            <Arrow aria-hidden="true" className="size-3.5" />
            <span className="sr-only">{up ? 'Up' : 'Down'}</span>
            {Math.abs(delta).toFixed(1)}%
          </span>
          <span className={featured ? 'text-white/55' : 'text-muted-foreground'}>{deltaLabel}</span>
        </p>
      )}
    </Card>
  );
}
