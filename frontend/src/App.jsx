import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { APP_TIMEZONE } from '@brightloop/shared';
import { api } from './api/client';
import { Logo } from '@/components/brand/logo';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

// Showcase pulls in Recharts; keep it out of the main bundle.
const DesignSystemPage = lazy(() => import('./pages/design-system/DesignSystemPage'));

const REFRESH_MS = 15_000;

function useHealth() {
  return useQuery({
    queryKey: ['health'],
    // 503 still carries a useful body (db: 'down'), so don't treat it as a thrown error.
    // A non-JSON body (proxy error page, empty reply) means the API itself isn't answering.
    queryFn: () =>
      api.get('/health', { validateStatus: () => true }).then((r) => {
        if (!r.data || typeof r.data !== 'object') {
          throw new Error(`Unexpected response from /api/health (HTTP ${r.status}).`);
        }
        return r.data;
      }),
    refetchInterval: REFRESH_MS,
  });
}

function summarise({ data, isPending, isError }) {
  if (isPending) return { headline: 'Checking services…', tone: 'neutral' };
  if (isError) return { headline: 'The API is not responding', tone: 'danger' };
  if (data.db !== 'up') return { headline: 'Database unavailable', tone: 'danger' };
  return { headline: 'All systems operational', tone: 'success' };
}

function StatusRow({ label, children }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3.5">
      <dt className="text-[0.8125rem] text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

function HealthPage() {
  const health = useHealth();
  const { data, isPending, isError, isFetching, error, refetch } = health;
  const { headline, tone } = summarise(health);
  const dbUp = data?.db === 'up';

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Logo />
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <span className="type-label text-muted-foreground">Status</span>
          <nav aria-label="Primary" className="ml-auto">
            <Button as={Link} to="/design-system" variant="tertiary" size="sm">
              Design system <ArrowUpRight />
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-20">
        <p className="type-label text-muted-foreground">Brightloop Subscriptions</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <h1 className="flex items-center gap-3 type-h1">
            <span
              aria-hidden="true"
              className={cn(
                'size-2.5 shrink-0',
                tone === 'success' && 'bg-success',
                tone === 'danger' && 'bg-danger',
                tone === 'neutral' && 'animate-pulse bg-subtle-foreground',
              )}
            />
            {headline}
          </h1>
          <Button variant="secondary" size="sm" onClick={() => refetch()} loading={isFetching}>
            {!isFetching && <RefreshCw />} Check now
          </Button>
        </div>
        <p className="mt-2 text-[0.8125rem] text-muted-foreground">
          Rechecked automatically every {REFRESH_MS / 1000} seconds.
        </p>

        <section aria-label="Service checks" className="mt-10 border-t-2 border-rule">
          {isPending && (
            <div className="divide-y" aria-label="Checking API">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex justify-between py-4">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              ))}
            </div>
          )}

          {isError && (
            <Alert tone="danger" title="API unreachable" className="mt-4">
              {error.message}
            </Alert>
          )}

          {data && (
            <dl className="divide-y border-b">
              <StatusRow label="API">
                <Badge tone="success" dot>
                  up
                </Badge>
              </StatusRow>
              <StatusRow label="Database">
                <Badge tone={dbUp ? 'success' : 'danger'} dot>
                  {dbUp ? 'up' : 'down'}
                </Badge>
                {!dbUp && data.dbError && (
                  <span className="mt-1 block font-mono text-xs text-danger-soft-foreground">
                    {data.dbError}
                  </span>
                )}
              </StatusRow>
              <StatusRow label="Server time (IST)">
                <span className="font-mono text-[0.8125rem] tabular-nums">{data.serverTime}</span>
              </StatusRow>
              <StatusRow label="Business date">
                <span className="font-mono text-[0.8125rem] tabular-nums">{data.today}</span>
              </StatusRow>
            </dl>
          )}
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap justify-between gap-2 px-4 py-5 type-caption text-muted-foreground sm:px-6">
          <span>Business dates follow {APP_TIMEZONE}.</span>
          <code className="font-mono">GET /api/health</code>
        </div>
      </footer>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="grid min-h-screen place-items-center text-muted-foreground">
      <Spinner className="size-5" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<HealthPage />} />
        <Route path="/design-system" element={<DesignSystemPage />} />
      </Routes>
    </Suspense>
  );
}
