import { cn } from '@/lib/utils';

const tones = {
  ink: 'bg-foreground',
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

// A flat meter with square ends, so it reads as a measure rather than a loading bar.
export function Progress({ value, max = 100, tone = 'ink', label, className }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden bg-muted', className)}
    >
      <div
        className={cn('h-full transition-[width] duration-300', tones[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
