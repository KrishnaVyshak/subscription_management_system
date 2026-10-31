import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-sm bg-muted', className)}
      {...props}
    />
  );
}
