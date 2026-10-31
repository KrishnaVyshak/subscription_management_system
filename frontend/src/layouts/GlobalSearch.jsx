import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useDebouncedValue } from '@/hooks/use-debounce';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { StatusBadge } from '@/components/ui/status-badge';
import { api } from '@/lib/api';
import { formatMoney, invoiceDisplayStatus } from '@/lib/format';
import { cn } from '@/lib/utils';

const SOURCES = [
  {
    key: 'subscriptions',
    label: 'Subscriptions',
    url: '/subscriptions',
    to: (r) => `/app/subscriptions/${r.id}`,
    title: (r) => r.number,
    detail: (r) => `${r.customerName} · ${r.planName}`,
    status: (r) => r.status,
  },
  {
    key: 'invoices',
    label: 'Invoices',
    url: '/invoices',
    to: (r) => `/app/invoices/${r.id}`,
    title: (r) => r.number,
    detail: (r) => `${r.customerName} · ${formatMoney(r.total)}`,
    status: (r) => invoiceDisplayStatus(r),
  },
  {
    key: 'customers',
    label: 'Customers',
    url: '/customers',
    to: (r) => `/app/customers/${r.id}`,
    title: (r) => r.name,
    detail: (r) => r.email,
  },
];

/** Topbar search: subscription or invoice number, customer name. */
export function GlobalSearch({ className }) {
  const navigate = useNavigate();
  const listId = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const term = useDebouncedValue(text.trim(), 300);
  const enabled = term.length >= 2;

  const results = useQueries({
    queries: SOURCES.map((s) => ({
      queryKey: ['search', s.key, term],
      queryFn: () => api.get(s.url, { search: term, pageSize: 5 }).then((r) => r.data),
      enabled,
      staleTime: 30_000,
    })),
  });

  const flat = useMemo(
    () =>
      SOURCES.flatMap((s, i) =>
        (results[i].data ?? []).map((row) => ({ source: s, row, id: `${s.key}-${row.id}` })),
      ),
    [results],
  );
  const loading = enabled && results.some((r) => r.isFetching);

  useEffect(() => {
    const onDown = (e) => !wrapRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, []);

  // "/" focuses search from anywhere outside a text field.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.target.closest('input,textarea,select,[contenteditable]')) return;
      e.preventDefault();
      wrapRef.current?.querySelector('input')?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (item) => {
    setOpen(false);
    setText('');
    navigate(item.source.to(item.row));
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flat[active]) {
      e.preventDefault();
      go(flat[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showPanel = open && enabled;

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <Input
        type="search"
        role="combobox"
        aria-label="Search subscriptions, invoices and customers"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-activedescendant={showPanel && flat[active] ? `${listId}-${flat[active].id}` : undefined}
        autoComplete="off"
        leading={loading ? <Spinner label="" /> : <Search />}
        placeholder="Search number or customer…"
        value={text}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />
      {showPanel && (
        <div
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="absolute top-full right-0 left-0 z-40 mt-1 max-h-[26rem] min-w-72 overflow-y-auto rounded-md border bg-popover py-1 text-popover-foreground shadow-overlay animate-fade-in sm:right-auto sm:w-[28rem]"
        >
          {SOURCES.map((s, si) => {
            const rows = results[si].data ?? [];
            if (!rows.length) return null;
            return (
              <div key={s.key} role="group" aria-label={s.label}>
                <p className="px-3 pt-2 pb-1 type-label text-subtle-foreground">{s.label}</p>
                {rows.map((row) => {
                  const item = flat.find((f) => f.id === `${s.key}-${row.id}`);
                  const index = flat.indexOf(item);
                  return (
                    <div
                      key={row.id}
                      id={`${listId}-${item.id}`}
                      role="option"
                      aria-selected={index === active}
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => go(item)}
                      onMouseEnter={() => setActive(index)}
                      className={cn('flex cursor-pointer items-center gap-3 px-3 py-1.5', index === active && 'bg-sunken')}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[0.8125rem] font-medium">{s.title(row)}</span>
                        <span className="block truncate type-caption text-muted-foreground">{s.detail(row)}</span>
                      </span>
                      {s.status && <StatusBadge status={s.status(row)} />}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {!loading && flat.length === 0 && (
            <p className="px-3 py-3 type-caption text-muted-foreground">Nothing matches “{term}”.</p>
          )}
          {loading && flat.length === 0 && <p className="px-3 py-3 type-caption text-muted-foreground">Searching…</p>}
        </div>
      )}
    </div>
  );
}
