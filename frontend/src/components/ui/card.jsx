import { cn } from '@/lib/utils';

// A sheet on the canvas: one hairline edge, no shadow. Parts inside are divided by rules.
export function Card({ as: Comp = 'section', className, ...props }) {
  return (
    <Comp className={cn('rounded-lg border bg-card text-card-foreground', className)} {...props} />
  );
}

/** Pass `action` to pin a button or control to the header's right edge. */
export function CardHeader({ className, action, children, ...props }) {
  return (
    <header
      className={cn('flex flex-wrap items-start gap-x-4 gap-y-3 px-4 pt-4 sm:px-5', className)}
      {...props}
    >
      <div className="min-w-40 flex-1">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

export function CardTitle({ as: Comp = 'h3', className, ...props }) {
  return <Comp className={cn('type-h3 text-foreground', className)} {...props} />;
}

export function CardDescription({ className, ...props }) {
  return <p className={cn('mt-0.5 type-caption text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }) {
  return <div className={cn('p-4 sm:p-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return (
    <footer
      className={cn('flex items-center gap-2 border-t bg-sunken/50 px-4 py-3 sm:px-5', className)}
      {...props}
    />
  );
}
