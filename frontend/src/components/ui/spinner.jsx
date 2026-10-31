import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className, label = 'Loading', ...props }) {
  return (
    <LoaderCircle
      role={label ? 'status' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : true}
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  );
}
