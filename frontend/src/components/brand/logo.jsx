import { cn } from '@/lib/utils';

// The mark: an open loop with a spark in its gap. Geometry is shared with LoopPattern
// (gap centred at -71°, 26% of the circumference open).
const tones = {
  ink: { tile: 'var(--color-ink-900)', loop: 'var(--color-volt-300)', spark: 'var(--color-paper)' },
  volt: {
    tile: 'var(--color-volt-300)',
    loop: 'var(--color-ink-900)',
    spark: 'var(--color-ink-900)',
  },
  paper: {
    tile: 'var(--color-paper)',
    loop: 'var(--color-ink-900)',
    spark: 'var(--color-tide-500)',
  },
};

/** tone: ink (default) | volt | paper */
export function LogoMark({ tone = 'ink', className, title }) {
  const c = tones[tone];
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-8 shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="32" height="32" rx="9" fill={c.tile} />
      <circle
        cx="16"
        cy="16"
        r="8"
        fill="none"
        stroke={c.loop}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray="36 14.27"
        transform="rotate(-20 16 16)"
      />
      <circle cx="18.6" cy="8.45" r="2.5" fill={c.spark} />
    </svg>
  );
}

export function Wordmark({ className }) {
  return (
    <span
      className={cn('text-[1.0625rem] leading-none font-semibold tracking-[-0.045em]', className)}
    >
      brightloop
    </span>
  );
}

export function Logo({ tone, className, markClassName }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark tone={tone} className={markClassName} title="Brightloop" />
      <Wordmark />
    </span>
  );
}
