import { cn } from '@/lib/utils';
import { controlBase } from './control-styles';

/** `leading` / `trailing` render an icon or affix (e.g. "₹", "%") inside the field. */
export function Input({ className, leading, trailing, type = 'text', ...props }) {
  const hasAffix = Boolean(leading || trailing);
  const input = (
    <input
      type={type}
      className={cn(
        controlBase,
        'h-10 px-3.5',
        leading && 'pl-10',
        trailing && 'pr-10',
        type === 'number' && 'tabular-nums',
        !hasAffix && className,
      )}
      {...props}
    />
  );
  if (!hasAffix) return input;

  const affix =
    'pointer-events-none absolute inset-y-0 flex items-center text-sm text-muted-foreground [&_svg]:size-4';
  return (
    <div className={cn('relative', className)}>
      {leading && <span className={cn(affix, 'left-3.5')}>{leading}</span>}
      {input}
      {trailing && <span className={cn(affix, 'right-3.5')}>{trailing}</span>}
    </div>
  );
}
