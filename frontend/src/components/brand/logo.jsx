import { cn } from '@/lib/utils';

// The mark: a loop that renews itself (the billing cycle) around a bright core (the subscription).
// Square caps and a near-square tile keep it in step with the rest of the Ledger geometry.
const tones = {
  // Follows the theme: a foreground tile with the figure cut in the background colour.
  auto: { tile: 'var(--foreground)', figure: 'var(--background)' },
  ink: { tile: 'var(--color-stone-900)', figure: 'var(--color-stone-50)' },
  paper: { tile: 'var(--color-stone-50)', figure: 'var(--color-stone-900)' },
  cobalt: { tile: 'var(--color-cobalt-600)', figure: 'var(--color-stone-50)' },
};

/** tone: auto (default) | ink | paper | cobalt */
export function LogoMark({ tone = 'auto', className, title }) {
  const c = tones[tone];
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('size-7 shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="32" height="32" rx="4" fill={c.tile} />
      {/* Three-quarter loop running clockwise from the top, ending in a square arrowhead. */}
      <path
        d="M16 7.5 A8.5 8.5 0 1 1 7.5 16"
        fill="none"
        stroke={c.figure}
        strokeWidth="3.25"
        strokeLinecap="square"
      />
      <path d="M3.6 16.4 L7.5 11.6 L11.4 16.4 Z" fill={c.figure} />
      {/* The bright core. */}
      <circle cx="16" cy="16" r="2.6" fill={c.figure} />
    </svg>
  );
}

export function Wordmark({ className }) {
  return (
    <span
      className={cn(
        'text-[1.0625rem] leading-none font-[650] tracking-[-0.045em] [font-stretch:125%]',
        className,
      )}
    >
      brightloop
    </span>
  );
}

export function Logo({ tone, className, markClassName }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark tone={tone} className={markClassName} title="Brightloop" />
      <Wordmark />
    </span>
  );
}
