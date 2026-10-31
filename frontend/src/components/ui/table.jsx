import { cn } from '@/lib/utils';

// Ledger rows: a heavy rule under the header, hairlines between entries, figures in mono.
export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full caption-bottom border-collapse text-[0.8125rem]', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn('[&_tr]:border-b-rule', className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return (
    <tr
      className={cn('border-b transition-colors duration-75 hover:bg-sunken/60', className)}
      {...props}
    />
  );
}

/** Set `numeric` on money/count columns: right-aligned with tabular figures. */
export function TableHead({ className, numeric, ...props }) {
  return (
    <th
      scope="col"
      className={cn(
        'h-9 px-4 text-left align-bottom pb-2 type-label whitespace-nowrap text-muted-foreground',
        numeric && 'text-right',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, numeric, ...props }) {
  return (
    <td
      className={cn(
        'px-4 py-2.5 align-middle',
        numeric && 'text-right font-mono text-[0.8125rem] tabular-nums',
        className,
      )}
      {...props}
    />
  );
}
