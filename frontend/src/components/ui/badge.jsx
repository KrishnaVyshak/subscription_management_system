import { cn } from '@/lib/utils';

const tones = {
  neutral: 'bg-muted text-muted-foreground',
  brand: 'bg-brand-soft text-brand-soft-foreground',
  volt: 'bg-highlight text-highlight-foreground',
  success: 'bg-success-soft text-success-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  danger: 'bg-danger-soft text-danger-soft-foreground',
  info: 'bg-info-soft text-info-soft-foreground',
  outline: 'text-foreground ring-1 ring-border ring-inset',
};

const dots = {
  neutral: 'bg-muted-foreground/70',
  brand: 'bg-tide-500 dark:bg-tide-300',
  volt: 'bg-highlight-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  outline: 'bg-foreground',
};

/** tone: neutral | brand | volt | success | warning | danger | info | outline */
export function Badge({ tone = 'neutral', dot = false, className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className={cn('size-1.5 rounded-full', dots[tone])} />}
      {children}
    </span>
  );
}
