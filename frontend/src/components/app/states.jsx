import { Link } from 'react-router-dom';
import { FileQuestion, RefreshCw } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { errorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

export { EmptyState };

/** A failed load, with a retry. */
export function ErrorState({ error, onRetry, title = "Couldn't load this", className }) {
  return (
    <Alert
      tone="danger"
      title={title}
      className={className}
      action={
        onRetry && (
          <Button size="sm" variant="secondary" onClick={() => onRetry()}>
            <RefreshCw /> Try again
          </Button>
        )
      }
    >
      {errorMessage(error)}
    </Alert>
  );
}

/** A record that doesn't exist, or isn't this user's (the API answers 404 for both). */
export function NotFoundState({ title = 'Not found', description, backTo, backLabel = 'Go back' }) {
  return (
    <EmptyState
      icon={FileQuestion}
      title={title}
      description={description ?? "This record doesn't exist, or you don't have access to it."}
      action={
        backTo && (
          <Button as={Link} to={backTo} variant="secondary">
            {backLabel}
          </Button>
        )
      }
    />
  );
}

/** Placeholder rows that mirror a table while it loads. */
export function TableSkeleton({ rows = 8, columns = 5 }) {
  return (
    <div aria-busy="true" aria-label="Loading" className="divide-y">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton
              key={c}
              className={cn('h-3.5', c === 0 ? 'w-1/4' : 'flex-1', c === columns - 1 && 'max-w-20')}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ lines = 4, className }) {
  return (
    <Card className={cn('space-y-3 p-4 sm:p-5', className)} aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3', i % 2 ? 'w-2/3' : 'w-5/6')} />
      ))}
    </Card>
  );
}

/** The shape of a typical page (header, figures, a sheet) while its data loads. */
export function PageSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-56" />
      </div>
      <div className="grid gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-4 bg-card px-5 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>
      <Card className="overflow-hidden">
        <TableSkeleton rows={6} />
      </Card>
    </div>
  );
}

/**
 * Renders a query's three states. `children(data)` renders the loaded data.
 * 404 → NotFoundState; 403 is redirected to /403 by the query cache.
 */
export function QueryState({ query, skeleton = <PageSkeleton />, notFound, children }) {
  if (query.isPending) return skeleton;
  if (query.isError) {
    if (query.error?.status === 404) return notFound ?? <NotFoundState />;
    if (query.error?.status === 403) return null;
    return <ErrorState error={query.error} onRetry={query.refetch} />;
  }
  return children(query.data);
}
