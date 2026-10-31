import { useState } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ErrorState } from './states';

/** Tooltip on the inverse surface. `format` renders each value (money by default). */
export function ChartTooltip({ active, payload, label, labelFormatter, format = formatMoney }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-44 rounded-md bg-inverse px-3 py-2 text-xs text-inverse-foreground shadow-overlay">
      <p className="mb-1.5 type-label text-inverse-muted">{labelFormatter ? labelFormatter(label) : label}</p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="size-2" style={{ background: p.color }} aria-hidden="true" />
            <span>{p.name}</span>
            <span className="ml-auto font-mono tabular-nums">{format(p.value, p)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Small square-swatch legend. items: [{ label, color }] */
export function ChartLegend({ items }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 type-caption text-muted-foreground">
      {items.map((it) => (
        <li key={it.label} className="flex items-center gap-1.5">
          <span className="size-2" style={{ background: it.color }} aria-hidden="true" />
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * A chart on a sheet with a Chart / Table switch, so every chart has an accessible table view.
 * `children` is the chart (inside a sized box); `table` is the same data as a table.
 */
export function ChartCard({ title, description, legend, table, query, empty, height = 'h-60', className, children }) {
  const [view, setView] = useState('chart');
  let body;
  if (query?.isPending) body = <Skeleton className={cn('mx-4 mb-4 sm:mx-5', height)} />;
  else if (query?.isError) body = <div className="p-4"><ErrorState error={query.error} onRetry={query.refetch} /></div>;
  else if (empty) body = <p className={cn('grid place-items-center px-4 type-caption text-muted-foreground', height)}>{empty}</p>;
  else if (view === 'table') body = <div className={cn('mt-3 overflow-y-auto border-t', height)}>{table}</div>;
  else body = <div className={cn('px-2 pt-3 pb-3', height)}>{children}</div>;

  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader
        action={
          table && (
            <Tabs value={view} onValueChange={setView}>
              <TabsList aria-label={`${title} view`}>
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="table">Table</TabsTrigger>
              </TabsList>
            </Tabs>
          )
        }
      >
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {legend && view === 'chart' && <div className="mt-3 px-4 sm:px-5">{legend}</div>}
      {body}
    </Card>
  );
}
