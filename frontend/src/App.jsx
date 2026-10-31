import { Route, Routes } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from './api/client';

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
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900">
      <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Brightloop Subscriptions</h1>
        <p className="mt-1 text-sm text-slate-500">System status</p>

        {isPending && <p className="mt-6 text-sm">Checking API…</p>}

        {isError && (
          <p className="mt-6 text-sm text-red-600">API unreachable: {error.message}</p>
        )}

        {data && (
          <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-slate-500">API</dt>
            <dd className="font-medium text-emerald-600">up</dd>
            <dt className="text-slate-500">Database</dt>
            <dd className={dbUp ? 'font-medium text-emerald-600' : 'font-medium text-red-600'}>
              {dbUp ? 'up' : `down${data.dbError ? ` (${data.dbError})` : ''}`}
            </dd>
            <dt className="text-slate-500">Server time (IST)</dt>
            <dd className="font-mono">{data.serverTime}</dd>
            <dt className="text-slate-500">Business date</dt>
            <dd className="font-mono">{data.today}</dd>
          </dl>
        )}
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HealthPage />} />
    </Routes>
  );
}
