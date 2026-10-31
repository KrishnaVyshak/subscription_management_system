import { lazy, Suspense } from 'react';
import { Link, Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Palette } from 'lucide-react';
import { api } from './api/client';
import { Logo } from '@/components/brand/logo';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';

// Showcase pulls in Recharts; keep it out of the main bundle.
const DesignSystemPage = lazy(() => import('./pages/design-system/DesignSystemPage'));

function useHealth() {
  return useQuery({
    queryKey: ['health'],
    // 503 still carries a useful body (db: 'down'), so don't treat it as a thrown error.
    queryFn: () => api.get('/health', { validateStatus: () => true }).then((r) => r.data),
    refetchInterval: 15_000,
  });
}

function HealthPage() {
  const { data, isPending, isError, error } = useHealth();
  const dbUp = data?.db === 'up';

  return (
    <main className="px-4 py-16">
      <Logo className="mx-auto mb-8 flex w-fit" />
      <Card className="mx-auto max-w-md">
        <CardHeader>
          <CardTitle className="type-h2">Brightloop Subscriptions</CardTitle>
          <CardDescription>System status</CardDescription>
        </CardHeader>

        <CardContent>
          {isPending && (
            <div className="space-y-3" aria-label="Checking API">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          )}

          {isError && (
            <Alert tone="danger" title="API unreachable">
              {error.message}
            </Alert>
          )}

          {data && (
            <dl className="grid grid-cols-[auto_1fr] items-center gap-x-6 gap-y-3 text-sm">
              <dt className="text-muted-foreground">API</dt>
              <dd>
                <Badge tone="success" dot>
                  up
                </Badge>
              </dd>
              <dt className="text-muted-foreground">Database</dt>
              <dd>
                <Badge tone={dbUp ? 'success' : 'danger'} dot>
                  {dbUp ? 'up' : `down${data.dbError ? ` (${data.dbError})` : ''}`}
                </Badge>
              </dd>
              <dt className="text-muted-foreground">Server time (IST)</dt>
              <dd className="font-mono text-xs">{data.serverTime}</dd>
              <dt className="text-muted-foreground">Business date</dt>
              <dd className="font-mono text-xs">{data.today}</dd>
            </dl>
          )}
        </CardContent>

        <CardFooter>
          <Button as={Link} to="/design-system" variant="link" size="sm">
            <Palette /> View the design system
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

function PageFallback() {
  return (
    <div className="grid min-h-screen place-items-center text-muted-foreground">
      <Spinner className="size-6" />
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
