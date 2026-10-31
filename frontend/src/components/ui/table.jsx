import { cn } from '@/lib/utils';

export function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn('w-full caption-bottom border-collapse text-sm', className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({ className, ...props }) {
  return <thead className={cn('bg-muted/60 [&_tr]:border-b', className)} {...props} />;
}

export function TableBody({ className, ...props }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }) {
  return (
    <tr className={cn('border-b transition-colors hover:bg-muted/50', className)} {...props} />
  );
}

/** Set `numeric` on money/count columns: right-aligned with tabular figures. */
export function TableHead({ className, numeric, ...props }) {
  return (
    <th
      scope="col"
      className={cn(
        'h-10 px-4 text-left align-middle type-overline whitespace-nowrap text-muted-foreground',
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
      className={cn('px-4 py-3 align-middle', numeric && 'text-right tabular-nums', className)}
      {...props}
    />
  );
}
