import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import { ErrorState, TableSkeleton } from './states';

// Clicks on controls inside a row shouldn't also open the row.
const isInteractive = (target) => Boolean(target.closest('a,button,input,select,textarea,label,[role="button"]'));

function SortHeader({ column, sort, onSortChange }) {
  const key = column.sortKey;
  const active = sort === key || sort === `-${key}`;
  const desc = sort === `-${key}`;
  const Icon = !active ? ChevronsUpDown : desc ? ArrowDown : ArrowUp;
  // First click sorts the column's natural way (money and dates: newest/largest first).
  const next = active ? (desc ? key : `-${key}`) : column.sortDesc ? `-${key}` : key;
  return (
    <button
      type="button"
      onClick={() => onSortChange(next)}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1 rounded-sm uppercase outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
        active && 'text-foreground',
        column.numeric && 'flex-row-reverse',
      )}
    >
      {column.header}
      <Icon aria-hidden="true" className="size-3" />
    </button>
  );
}

function Pagination({ page, pageSize, total, onPageChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2.5 sm:px-4">
      <p className="font-mono text-xs text-muted-foreground tabular-nums" aria-live="polite">
        {formatNumber(first)}–{formatNumber(last)} of {formatNumber(total)}
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-1.5">
        <span className="mr-1 hidden font-mono text-xs text-muted-foreground sm:inline">
          Page {page} of {formatNumber(pages)}
        </span>
        <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft /> Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight />
        </Button>
      </nav>
    </footer>
  );
}

/**
 * Server-driven table on a sheet.
 *
 * columns: [{ id, header, cell(row), sortKey?, sortDesc?, numeric?, className?, primary?,
 *             mobile?: false (hide in the card view) }]
 * query: a TanStack query whose data is { data: rows, meta }.
 * Sorting and paging are controlled (`sort`, `onSortChange`, `page`, `onPageChange`); the parent
 * keeps them in the URL. Pass `selected` (Set of ids) + `onSelectedChange` to enable bulk selection;
 * `bulkActions(selectedIds)` replaces the toolbar while rows are selected.
 */
export function DataTable({
  columns,
  query,
  label,
  toolbar,
  empty,
  footer,
  sort,
  onSortChange,
  page = 1,
  pageSize = 25,
  onPageChange,
  onRowClick,
  getRowId = (row) => row.id,
  selected,
  onSelectedChange,
  bulkActions,
  rowClassName,
  className,
}) {
  const rows = query.data?.data ?? [];
  const meta = query.data?.meta;
  const selectable = Boolean(selected && onSelectedChange);
  const pageIds = rows.map(getRowId);
  const allOnPage = selectable && pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  };
  const toggleAll = () => {
    const next = new Set(selected);
    for (const id of pageIds) {
      if (allOnPage) next.delete(id);
      else next.add(id);
    }
    onSelectedChange(next);
  };

  const rowProps = (row) =>
    onRowClick
      ? {
          tabIndex: 0,
          className: 'cursor-pointer focus-visible:bg-sunken focus-visible:outline-none',
          onClick: (e) => !isInteractive(e.target) && onRowClick(row),
          onKeyDown: (e) => {
            if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick(row);
          },
        }
      : {};

  let body;
  if (query.isPending) {
    body = <TableSkeleton rows={Math.min(pageSize, 8)} columns={Math.min(columns.length, 6)} />;
  } else if (query.isError) {
    body = (
      <div className="p-4">
        <ErrorState error={query.error} onRetry={query.refetch} />
      </div>
    );
  } else if (rows.length === 0) {
    body = <div className="p-3 sm:p-4">{empty}</div>;
  } else {
    body = (
      <>
        {/* Wide screens: the ledger table. */}
        <div className={cn('hidden sm:block', query.isPlaceholderData && 'opacity-60 transition-opacity')}>
          <Table aria-label={label} aria-busy={query.isFetching || undefined}>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {selectable && (
                  <TableHead className="w-10 pr-0">
                    <Checkbox aria-label="Select all on this page" checked={allOnPage} onChange={toggleAll} />
                  </TableHead>
                )}
                {columns.map((col) => {
                  const active = col.sortKey && (sort === col.sortKey || sort === `-${col.sortKey}`);
                  return (
                    <TableHead
                      key={col.id}
                      numeric={col.numeric}
                      className={col.headClassName}
                      aria-sort={active ? (sort.startsWith('-') ? 'descending' : 'ascending') : undefined}
                    >
                      {col.sortKey && onSortChange ? (
                        <SortHeader column={col} sort={sort} onSortChange={onSortChange} />
                      ) : (
                        col.header
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const id = getRowId(row);
                const isSelected = selectable && selected.has(id);
                const props = rowProps(row);
                return (
                  <TableRow
                    key={id}
                    {...props}
                    aria-selected={selectable ? isSelected : undefined}
                    className={cn(
                      props.className,
                      isSelected && 'bg-accent-soft/60 hover:bg-accent-soft/80',
                      rowClassName?.(row),
                    )}
                  >
                    {selectable && (
                      <TableCell className="pr-0">
                        <Checkbox aria-label={`Select row ${id}`} checked={isSelected} onChange={() => toggle(id)} />
                      </TableCell>
                    )}
                    {columns.map((col) => (
                      <TableCell key={col.id} numeric={col.numeric} className={col.className}>
                        {col.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Phones: each row collapses to a ruled card. */}
        <ul className="divide-y sm:hidden" aria-label={label}>
          {rows.map((row) => {
            const id = getRowId(row);
            const primary = columns.find((c) => c.primary) ?? columns[0];
            const rest = columns.filter((c) => c !== primary && c.mobile !== false);
            const props = rowProps(row);
            return (
              <li key={id} {...props} className={cn('px-3 py-3', props.className, rowClassName?.(row))}>
                <div className="flex items-start gap-3">
                  {selectable && (
                    <Checkbox aria-label={`Select row ${id}`} checked={selected.has(id)} onChange={() => toggle(id)} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{primary.cell(row)}</div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                      {rest.map((col) => (
                        <div key={col.id} className="min-w-0">
                          <dt className="type-label text-subtle-foreground">{col.header}</dt>
                          <dd className="truncate text-[0.8125rem]">{col.cell(row)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </>
    );
  }

  const selectedCount = selectable ? selected.size : 0;

  return (
    <Card className={cn('overflow-hidden', className)}>
      {(toolbar || selectedCount > 0) && (
        <div className="flex min-h-14 flex-col gap-2 border-b px-3 py-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:px-4">
          {selectedCount > 0 ? (
            <>
              <p className="font-mono text-xs" aria-live="polite">
                {selectedCount} selected
              </p>
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <Button variant="tertiary" size="sm" onClick={() => onSelectedChange(new Set())}>
                  Clear
                </Button>
                {bulkActions?.([...selected])}
              </div>
            </>
          ) : (
            toolbar
          )}
        </div>
      )}
      {body}
      {footer && rows.length > 0 && footer}
      {meta && onPageChange && rows.length > 0 && (
        <Pagination page={page} pageSize={meta.pageSize ?? pageSize} total={meta.total ?? 0} onPageChange={onPageChange} />
      )}
    </Card>
  );
}

/** A simple client table for small, already-loaded sets (lines, payments on an invoice). */
export function SimpleTable({ columns, rows, getRowId = (r) => r.id, label, empty, footer, className }) {
  if (!rows?.length) return empty ?? null;
  return (
    <Table aria-label={label} className={className}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((c) => (
            <TableHead key={c.id} numeric={c.numeric} className={c.headClassName}>
              {c.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, i) => (
          <TableRow key={getRowId(row) ?? i}>
            {columns.map((c) => (
              <TableCell key={c.id} numeric={c.numeric} className={c.className}>
                {c.cell(row, i)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
      {footer}
    </Table>
  );
}
