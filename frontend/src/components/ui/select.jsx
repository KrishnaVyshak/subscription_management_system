import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { controlBase } from './control-styles';

// Native <select>: keyboard, mobile pickers and form submission come for free.
export function Select({ className, children, ...props }) {
  return (
    <div className={cn('relative', className)}>
      <select
        className={cn(controlBase, 'h-10 cursor-pointer appearance-none pr-10 pl-3.5')}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}
