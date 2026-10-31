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
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        on ? 'bg-primary' : 'bg-input',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-4 rounded-full shadow-xs transition-transform',
          on ? 'bg-primary-foreground' : 'bg-white dark:bg-ink-200',
          on ? 'translate-x-[1.125rem]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
