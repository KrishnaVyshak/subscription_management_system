import { cn } from '@/lib/utils';

// Badges are stamps, not pills: square-cornered, mono, upper case.
const tones = {
  neutral: 'bg-muted text-muted-foreground',
  ink: 'bg-foreground text-background',
  accent: 'bg-accent-soft text-accent-soft-foreground',
  success: 'bg-success-soft text-success-soft-foreground',
  warning: 'bg-warning-soft text-warning-soft-foreground',
  danger: 'bg-danger-soft text-danger-soft-foreground',
  info: 'bg-info-soft text-info-soft-foreground',
  outline: 'text-foreground ring-1 ring-input ring-inset',
};

const markers = {
  neutral: 'bg-subtle-foreground',
  ink: 'bg-background',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  outline: 'bg-foreground',
};

/** tone: neutral | ink | accent | success | warning | danger | info | outline */
export function Badge({ tone = 'neutral', dot = false, className, children, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1.5 rounded-sm px-1.5 type-label whitespace-nowrap',
        tones[tone],
        className,
      )}
      {...props}
    >
      {dot && <span aria-hidden="true" className={cn('size-1.5 shrink-0', markers[tone])} />}
      {children}
    </span>
  );
}
