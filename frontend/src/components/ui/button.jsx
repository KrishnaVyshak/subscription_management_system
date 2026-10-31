import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

const base =
  'relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full font-medium whitespace-nowrap ' +
  'transition-[color,background-color,border-color,box-shadow,filter] duration-300 ease-glide select-none outline-none ' +
  'active:shadow-press active:brightness-[0.96] active:duration-75 ' +
  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 ' +
  '[&_svg]:pointer-events-none [&_svg]:shrink-0';

const sizes = {
  sm: 'h-8 gap-1.5 px-3.5 text-xs [&_svg]:size-3.5',
  md: 'h-10 gap-2 px-5 text-sm [&_svg]:size-4',
  lg: 'h-12 gap-2.5 px-6 text-[0.9375rem] [&_svg]:size-[1.125rem]',
  icon: 'size-10 [&_svg]:size-4',
  'icon-sm': 'size-8 [&_svg]:size-3.5',
};

const variants = {
  primary: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover',
  accent:
    'bg-highlight text-highlight-foreground shadow-xs hover:shadow-glow hover:brightness-[1.03]',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
  outline:
    'border border-input bg-card text-foreground shadow-xs hover:border-foreground/30 hover:bg-muted',
  ghost: 'text-foreground hover:bg-muted',
  danger: 'bg-danger text-danger-foreground shadow-xs hover:bg-danger-hover',
  link: 'h-auto overflow-visible rounded-none px-0 text-link underline-offset-4 hover:underline active:shadow-none active:brightness-100',
};

// Matches --animate-loop-ripple in index.css.
const RIPPLE_MS = 700;

const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * The brand's press feedback: an open loop (the logo's shape) expands and turns from the
 * pointer, over a soft glow. Keyboard presses ripple from the centre. Sits at -z-10 inside the
 * button's isolated stacking context, so it paints above the fill but beneath the label.
 */
function useLoopRipple(enabled) {
  const [ripples, setRipples] = useState([]);
  const nextId = useRef(0);

  const spawn = (el, x, y) => {
    if (!enabled || prefersReducedMotion()) return;
    const rect = el.getBoundingClientRect();
    const size = Math.hypot(rect.width, rect.height) * 1.6;
    const id = nextId.current++;
    setRipples((rs) => [...rs, { id, x: x ?? rect.width / 2, y: y ?? rect.height / 2, size }]);
    // Timer rather than animationend: that event is skipped in background tabs, which would leak.
    setTimeout(() => setRipples((rs) => rs.filter((r) => r.id !== id)), RIPPLE_MS);
  };

  const handlers = {
    onPointerDown: (e) => {
      if (e.button !== 0) return;
      const rect = e.currentTarget.getBoundingClientRect();
      spawn(e.currentTarget, e.clientX - rect.left, e.clientY - rect.top);
    },
    // detail === 0 means the click came from the keyboard (Enter / Space).
    onClick: (e) => e.detail === 0 && spawn(e.currentTarget),
  };

  const layer = ripples.map(({ id, x, y, size }) => (
    <span
      key={id}
      aria-hidden="true"
      className="pointer-events-none absolute -z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y, width: size, height: size }}
    >
      <span className="absolute inset-0 animate-loop-glow rounded-full bg-current opacity-0" />
      <svg
        viewBox="0 0 40 40"
        fill="none"
        className="absolute inset-0 animate-loop-ripple opacity-0"
        style={{ width: '100%', height: '100%' }}
      >
        <circle
          cx="20"
          cy="20"
          r="18"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          pathLength="100"
          strokeDasharray="74 26"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </span>
  ));

  return { handlers, layer };
}

/**
 * variant: primary | accent | secondary | outline | ghost | danger | link
 *   primary is Tide in both themes; accent is Volt (one per screen, at most).
 * size: sm | md | lg | icon | icon-sm
 * Pass `as={Link}` to render a router link styled as a button.
 */
export function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  onPointerDown,
  onClick,
  className,
  children,
  ...props
}) {
  const isButton = Comp === 'button';
  const ripple = useLoopRipple(variant !== 'link');

  return (
    <Comp
      type={isButton ? type : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={!isButton && disabled ? true : undefined}
      aria-busy={loading || undefined}
      className={cn(base, sizes[size], variants[variant], className)}
      onPointerDown={(e) => {
        ripple.handlers.onPointerDown(e);
        onPointerDown?.(e);
      }}
      onClick={(e) => {
        ripple.handlers.onClick(e);
        onClick?.(e);
      }}
      {...props}
    >
      {ripple.layer}
      {loading && <Spinner label="" />}
      {children}
    </Comp>
  );
}
