import { useId } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Checkbox({ label, description, className, id, ...props }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <span className="relative mt-0.5 grid size-4 shrink-0">
        <input
          id={inputId}
          type="checkbox"
          className={cn(
            'peer size-4 cursor-pointer appearance-none rounded-sm border border-input bg-card transition-colors outline-none',
            'checked:border-primary checked:bg-primary hover:border-foreground/55',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          {...props}
        />
        <Check
          aria-hidden="true"
          strokeWidth={3}
          className="pointer-events-none absolute inset-0.5 size-3 text-primary-foreground opacity-0 peer-checked:opacity-100"
        />
      </span>
      {label && (
        <label htmlFor={inputId} className="cursor-pointer text-[0.8125rem] leading-5">
          <span className="font-medium text-foreground">{label}</span>
          {description && <span className="block text-muted-foreground">{description}</span>}
        </label>
      )}
    </div>
  );
}
