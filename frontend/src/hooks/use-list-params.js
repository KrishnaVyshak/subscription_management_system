import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * List state (filters, sort, page, pageSize) lives in the URL, so lists are shareable and survive
 * a refresh. `defaults` fills keys missing from the URL; they are not written back.
 *
 *   const { params, set, page, pageSize, sort } = useListParams({ sort: '-createdAt' });
 *   set({ status: 'active' })        // resets page to 1
 *   set({ page: 3 }, { resetPage: false })
 */
export function useListParams(defaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // `defaults` is a literal at each call site: its content, not its identity, matters.
  const defaultsKey = JSON.stringify(defaults);
  const params = useMemo(() => {
    const out = JSON.parse(defaultsKey);
    for (const [k, v] of searchParams.entries()) out[k] = v;
    return out;
  }, [searchParams, defaultsKey]);

  const set = useCallback(
    (patch, { resetPage = true, replace = true } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v === undefined || v === null || v === '' || v === false) next.delete(k);
            else next.set(k, String(v));
          }
          if (resetPage && !('page' in patch)) next.delete('page');
          return next;
        },
        { replace },
      );
    },
    [setSearchParams],
  );

  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 25));

  return { params, set, page, pageSize, sort: params.sort ?? '' };
}
