import { cn } from '@/lib/utils';

export function Card({ className, ...props }) {
  return (
    <div
      className={cn('rounded-2xl border bg-card text-card-foreground shadow-card', className)}
      {...props}
    />
  );
}

/** Pass `action` to pin a button or menu to the header's right edge. */
export function CardHeader({ className, action, children, ...props }) {
  return (
    <div
      className={cn('flex flex-wrap items-start gap-x-4 gap-y-3 px-6 pt-6', className)}
      {...props}
    >
      <div className="min-w-40 flex-1 space-y-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardTitle({ className, ...props }) {
  return <h3 className={cn('type-h3 text-foreground', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn('flex items-center gap-3 rounded-b-2xl border-t px-6 py-4', className)}
      {...props}
    />
  );
}
