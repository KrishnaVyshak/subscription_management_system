import { cn } from '@/lib/utils';

export function Label({ className, required, children, ...props }) {
  return (
    <label className={cn('text-xs font-medium text-foreground', className)} {...props}>
      {children}
      {required && (
        <span aria-hidden="true" className="ml-1 text-danger">
          *
        </span>
      )}
    </label>
  );
}
