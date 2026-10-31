import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

// Quiet card with a tinted icon chip: the colour marks the kind, the copy carries the meaning.
const tones = {
  info: { icon: Info, chip: 'bg-info-soft text-info-soft-foreground' },
  success: { icon: CircleCheck, chip: 'bg-success-soft text-success-soft-foreground' },
  warning: { icon: TriangleAlert, chip: 'bg-warning-soft text-warning-soft-foreground' },
  danger: { icon: CircleAlert, chip: 'bg-danger-soft text-danger-soft-foreground' },
};

/** tone: info | success | warning | danger. `action` renders at the right (e.g. a Button). */
export function Alert({ tone = 'info', title, action, className, children, ...props }) {
  const { icon: Icon, chip } = tones[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3.5 rounded-2xl border bg-card p-4 shadow-card',
        tone === 'danger' && 'border-danger/30',
        className,
      )}
      {...props}
    >
      <span className={cn('grid size-8 shrink-0 place-items-center rounded-full', chip)}>
        <Icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1 pt-1 text-sm">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        {children && (
          <div className={cn('text-muted-foreground', title && 'mt-0.5')}>{children}</div>
        )}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}
