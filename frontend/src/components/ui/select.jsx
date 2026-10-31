import { ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { controlBase } from './control-styles';

// Native <select>: keyboard, mobile pickers and form submission come for free.
export function Select({ className, children, ...props }) {
  return (
    <div className={cn('relative', className)}>
      <select
        className={cn(controlBase, 'h-9 cursor-pointer appearance-none pr-9 pl-3')}
        {...props}
      >
        {children}
      </select>
      <ChevronsUpDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
