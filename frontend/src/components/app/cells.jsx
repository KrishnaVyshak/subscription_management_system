import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

/** INR from an API money string, in mono figures. */
export function MoneyCell({ value, className }) {
  return <span className={cn('font-mono tabular-nums whitespace-nowrap', className)}>{formatMoney(value)}</span>;
}

/** A business date or timestamp as "31 Oct 2026". */
export function DateCell({ value, withTime = false, className }) {
  return (
    <span className={cn('font-mono text-xs whitespace-nowrap tabular-nums', !value && 'text-subtle-foreground', className)}>
      {withTime ? formatDateTime(value) : formatDate(value)}
    </span>
  );
}

/** A document number (SUB/2026/00001) with an optional second line. */
export function RefCell({ primary, secondary }) {
  return (
    <span className="block min-w-0">
      <span className="block font-mono text-[0.8125rem] font-medium whitespace-nowrap">{primary}</span>
      {secondary && <span className="block truncate type-caption text-muted-foreground">{secondary}</span>}
    </span>
  );
}

/** Label/value pairs on a sheet, ruled between rows. */
export function DetailList({ items, className }) {
  return (
    <dl className={cn('divide-y text-[0.8125rem]', className)}>
      {items
        .filter(Boolean)
        .map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[minmax(7rem,40%)_1fr] gap-4 py-2.5">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 break-words">{value ?? <span className="text-subtle-foreground">—</span>}</dd>
          </div>
        ))}
    </dl>
  );
}
