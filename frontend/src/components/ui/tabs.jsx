import { createContext, useContext, useId, useState } from 'react';
import { cn } from '@/lib/utils';

const TabsContext = createContext(null);
const VariantContext = createContext('segmented');

/** Controlled (`value` + `onValueChange`) or uncontrolled (`defaultValue`). */
export function Tabs({ value, defaultValue, onValueChange, className, children }) {
  const [internal, setInternal] = useState(defaultValue);
  const baseId = useId();
  const current = value ?? internal;
  const select = (next) => {
    if (value === undefined) setInternal(next);
    onValueChange?.(next);
  };
  return (
    <TabsContext.Provider value={{ current, select, baseId }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

const listVariants = {
  segmented: 'inline-flex items-center gap-0.5 rounded-full bg-muted p-1',
  underline: 'flex items-center gap-6 border-b',
};

const triggerVariants = {
  segmented:
    'h-8 rounded-full px-3.5 aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-xs dark:aria-selected:bg-secondary-hover',
  underline:
    '-mb-px h-11 border-b-2 border-transparent aria-selected:border-foreground aria-selected:text-foreground',
};

/** variant: segmented (filters, view switches) | underline (page sections) */
export function TabsList({ variant = 'segmented', className, children, ...props }) {
  // Arrow keys move between tabs, per the WAI-ARIA tabs pattern.
  const onKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const tabs = [...e.currentTarget.querySelectorAll('[role="tab"]:not(:disabled)')];
    const i = tabs.indexOf(document.activeElement);
    const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
    next?.focus();
    next?.click();
  };
  return (
    <VariantContext.Provider value={variant}>
      <div
        role="tablist"
        onKeyDown={onKeyDown}
        className={cn(listVariants[variant], className)}
        {...props}
      >
        {children}
      </div>
    </VariantContext.Provider>
  );
}

export function TabsTrigger({ value, className, children, ...props }) {
  const { current, select, baseId } = useContext(TabsContext);
  const variant = useContext(VariantContext);
  const selected = current === value;
  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      onClick={() => select(value)}
      className={cn(
        'inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4',
        triggerVariants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className, children, ...props }) {
  const { current, baseId } = useContext(TabsContext);
  if (current !== value) return null;
  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      className={cn('animate-fade-in outline-none', className)}
      {...props}
    >
      {children}
    </div>
  );
}
