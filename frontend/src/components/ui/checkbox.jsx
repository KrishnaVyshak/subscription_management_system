import { useId } from 'react';
import { cn } from '@/lib/utils';

export function Checkbox({ label, description, className, id, ...props }) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        {...props}
      />
      {label && (
        <label htmlFor={inputId} className="cursor-pointer text-sm leading-5">
          <span className="font-medium text-foreground">{label}</span>
          {description && <span className="block text-muted-foreground">{description}</span>}
        </label>
      )}
    </div>
  );
}
