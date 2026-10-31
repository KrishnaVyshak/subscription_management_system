import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

// Rectangular, tight and quiet: hierarchy comes from fill, not from size or colour.
// The surface (fill, edge, shadow) lives on ::before so a press can squeeze it in from both
// sides (and a hair vertically) while the label and icons stay untouched; focus is a Cobalt outline.
const base =
  'relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md font-medium whitespace-nowrap select-none ' +
  'transition-colors duration-100 ease-out outline-none ' +
  'before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:origin-center ' +
  'before:transition-[background-color,border-color,box-shadow,scale] before:duration-100 before:ease-out ' +
  'active:before:scale-x-[0.96] active:before:scale-y-[0.97] ' +
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
    'text-primary-foreground before:bg-primary before:shadow-[inset_0_-1px_0_0_oklch(0_0_0/0.25)] hover:before:bg-primary-hover',
  // A sheet with an edge: every other action that changes something.
  secondary:
    'text-secondary-foreground before:border before:border-input before:bg-secondary hover:before:border-foreground/45 hover:before:bg-secondary-hover',
  // Text that becomes a control on hover: dismissals, toolbars, low-stakes navigation.
  tertiary: 'text-foreground hover:before:bg-foreground/[0.07] active:before:bg-foreground/10',
  // Irreversible. Solid red, always paired with copy that names what is destroyed.
  danger: 'text-danger-foreground before:bg-danger hover:before:bg-danger-hover',
  // Destructive but routine (remove a row): red text, fills only on hover.
  'danger-quiet':
    'text-danger-soft-foreground before:border before:border-danger/35 hover:before:border-danger/60 hover:before:bg-danger-soft',
  link: 'h-auto rounded-sm px-0 text-link underline decoration-link/35 underline-offset-[3px] hover:decoration-link',
};

/**
 * variant: primary | secondary | tertiary | danger | danger-quiet | link
 *   One primary per view; destructive actions use danger (irreversible) or danger-quiet (routine).
 * size: sm | md | lg | icon | icon-sm. Icon sizes need an aria-label.
 * Surface overrides via className go on the layer: `hover:before:bg-*`, not `hover:bg-*`.
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
