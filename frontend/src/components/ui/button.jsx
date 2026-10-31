import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

// Rectangular, tight and quiet: hierarchy comes from fill, not from size or colour.
// Press squeezes the control in from both sides (no vertical shift); focus is a Cobalt outline.
const base =
  'relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-medium whitespace-nowrap select-none ' +
  'transition-[color,background-color,border-color,box-shadow,scale] duration-100 ease-out outline-none ' +
  'origin-center active:scale-x-[0.94] ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ' +
  'disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40 ' +
  'aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0';

const sizes = {
  sm: 'h-7 gap-1.5 px-2.5 text-xs [&_svg]:size-3.5',
  md: 'h-9 gap-2 px-3.5 text-[0.8125rem] [&_svg]:size-4',
  lg: 'h-11 gap-2 px-5 text-sm [&_svg]:size-4',
  icon: 'size-9 [&_svg]:size-4',
  'icon-sm': 'size-7 [&_svg]:size-3.5',
};

const variants = {
  // Ink fill: the one step that moves the task forward.
  primary:
    'bg-primary text-primary-foreground shadow-[inset_0_-1px_0_0_oklch(0_0_0/0.25)] hover:bg-primary-hover',
  // A sheet with an edge: every other action that changes something.
  secondary:
    'border border-input bg-secondary text-secondary-foreground hover:border-foreground/45 hover:bg-secondary-hover',
  // Text that becomes a control on hover: dismissals, toolbars, low-stakes navigation.
  tertiary: 'text-foreground hover:bg-foreground/[0.07] active:bg-foreground/10',
  // Irreversible. Solid red, always paired with copy that names what is destroyed.
  danger: 'bg-danger text-danger-foreground hover:bg-danger-hover',
  // Destructive but routine (remove a row): red text, fills only on hover.
  'danger-quiet':
    'border border-danger/35 text-danger-soft-foreground hover:border-danger/60 hover:bg-danger-soft',
  link: 'h-auto rounded-sm px-0 text-link underline decoration-link/35 underline-offset-[3px] hover:decoration-link active:scale-x-100',
};

/**
 * variant: primary | secondary | tertiary | danger | danger-quiet | link
 *   One primary per view; destructive actions use danger (irreversible) or danger-quiet (routine).
 * size: sm | md | lg | icon | icon-sm. Icon sizes need an aria-label.
 * Pass `as={Link}` to render a router link styled as a button.
 */
export function Button({
  as: Comp = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}) {
  const isButton = Comp === 'button';

  return (
    <Comp
      type={isButton ? type : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-disabled={!isButton && disabled ? true : undefined}
      aria-busy={loading || undefined}
      className={cn(
        base,
        sizes[size],
        variants[variant],
        loading && 'disabled:opacity-80',
        className,
      )}
      {...props}
    >
      {loading && <Spinner label="" />}
      {children}
    </Comp>
  );
}
