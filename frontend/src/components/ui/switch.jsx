import { useState } from 'react';
import { cn } from '@/lib/utils';

/** Controlled (`checked` + `onCheckedChange`) or uncontrolled (`defaultChecked`). */
export function Switch({ checked, defaultChecked = false, onCheckedChange, className, ...props }) {
  const [internal, setInternal] = useState(defaultChecked);
  const on = checked ?? internal;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => {
        if (checked === undefined) setInternal(!on);
        onCheckedChange?.(!on);
      }}
      className={cn(
        'relative inline-flex h-[1.125rem] w-8 shrink-0 cursor-pointer items-center rounded-sm border transition-colors duration-100 outline-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        on ? 'border-primary bg-primary' : 'border-input bg-muted hover:border-foreground/45',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-3 rounded-[1px] transition-transform duration-150 ease-out',
          on ? 'translate-x-[0.9375rem] bg-primary-foreground' : 'translate-x-0.5 bg-foreground/60',
        )}
      />
    </button>
  );
}
