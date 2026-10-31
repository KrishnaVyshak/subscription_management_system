import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

// A tinted strip: icon and tint mark the kind, the copy carries the meaning.
const tones = {
  info: { icon: Info, box: 'border-info/30 bg-info-soft', mark: 'text-info' },
  success: { icon: CircleCheck, box: 'border-success/30 bg-success-soft', mark: 'text-success' },
  warning: {
    icon: TriangleAlert,
    box: 'border-warning/50 bg-warning-soft',
    mark: 'text-warning-soft-foreground',
  },
  danger: { icon: CircleAlert, box: 'border-danger/35 bg-danger-soft', mark: 'text-danger' },
};

/** tone: info | success | warning | danger. `action` renders at the right (e.g. a Button). */
export function Alert({ tone = 'info', title, action, className, children, ...props }) {
  const { icon: Icon, box, mark } = tones[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex flex-wrap items-start gap-x-3 gap-y-2 rounded-md border px-3.5 py-3 text-[0.8125rem]',
        box,
        className,
      )}
      {...props}
    >
      <Icon aria-hidden="true" className={cn('mt-0.5 size-4 shrink-0', mark)} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-foreground">{title}</p>}
        {children && <div className="text-foreground/75">{children}</div>}
      </div>
      {action && <div className="ml-7 shrink-0 self-center sm:ml-0">{action}</div>}
    </div>
  );
}
