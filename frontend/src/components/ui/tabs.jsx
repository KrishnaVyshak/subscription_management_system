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
  // A sunken well; the selected option is a raised sheet inside it.
  segmented: 'inline-flex items-center gap-px rounded-md border bg-sunken p-0.5',
  // Page sections: a 2px Ink rule under the current tab, sitting on the hairline.
  underline: 'flex items-center gap-5 overflow-x-auto border-b',
};

const triggerVariants = {
  segmented:
    'h-7 rounded-sm px-2.5 text-xs aria-selected:bg-card aria-selected:text-foreground aria-selected:shadow-[0_0_0_1px_var(--border)]',
  underline:
    '-mb-px h-10 border-b-2 border-transparent text-[0.8125rem] aria-selected:border-rule aria-selected:text-foreground',
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
        'inline-flex shrink-0 cursor-pointer items-center gap-1.5 font-medium whitespace-nowrap text-muted-foreground transition-colors duration-100 outline-none hover:text-foreground',
        'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
        'disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-3.5',
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
