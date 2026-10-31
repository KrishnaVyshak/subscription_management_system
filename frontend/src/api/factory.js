import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';

// Query keys follow one convention: ['subscriptions', filters] for a list (the whole envelope
// { data, meta }) and ['subscription', id] for a record (just the data).

/** A paginated list. Keeps the previous page on screen while the next one loads. */
export function useList(key, url, params = {}, options = {}) {
  return useQuery({
    queryKey: [key, params],
    queryFn: () => api.get(url, params),
    placeholderData: keepPreviousData,
    ...options,
  });
}

/** One record by id (disabled until the id is known). */
export function useRecord(key, url, id, options = {}) {
  return useQuery({
    queryKey: [key, id],
    queryFn: () => api.get(`${url}/${id}`).then((r) => r.data),
    enabled: Boolean(id),
    ...options,
  });
}

/**
 * A mutation that refreshes what it touched and confirms with a toast.
 * invalidate: query-key prefixes to refetch afterwards (e.g. [['subscriptions'], ['subscription', id]]).
 * success: a toast title, or (result, vars) => title | null.
 * Errors toast globally (queryClient.js) unless `manualError` is set, e.g. for forms that map
 * 400s onto their fields.
 */
export function useApiMutation({ mutationFn, invalidate = [], success, manualError = false, onSuccess, ...rest }) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn,
    meta: { manualError },
    ...rest,
    onSuccess: async (result, vars, ctx) => {
      const keys = typeof invalidate === 'function' ? invalidate(result, vars) : invalidate;
      await Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
      const title = typeof success === 'function' ? success(result, vars) : success;
      if (title) toast.success(title);
      await onSuccess?.(result, vars, ctx);
    },
  });
}

/** Keys every money-moving mutation refreshes, so dashboards and receivables stay true. */
export const FINANCE_KEYS = [['report'], ['receivables'], ['invoices'], ['payments'], ['customer']];
