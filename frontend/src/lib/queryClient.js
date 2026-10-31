import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notifyError } from './errors';
import { navigateTo } from './navigation';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // A page load the role can't see goes to /403 (the API enforces; the UI only explains).
    onError: (err, query) => {
      if (err?.status === 403 && !query.meta?.allowForbidden) {
        toast.error("You don't have access");
        navigateTo('/403', { replace: true });
      }
    },
  }),
  mutationCache: new MutationCache({
    // Every mutation shows its error unless the caller handles it (forms map 400s onto fields).
    onError: (err, _vars, _ctx, mutation) => {
      if (!mutation.meta?.manualError) notifyError(err);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Client errors (4xx) won't change on retry.
      retry: (count, err) => count < 1 && !(err?.status >= 400 && err?.status < 500),
    },
  },
});
