import { LoopPattern } from '@/components/brand/loop-pattern';
import { cn } from '@/lib/utils';

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed px-6 py-14 text-center',
        className,
      )}
    >
      <LoopPattern
        rings={6}
        className="absolute top-1/2 left-1/2 size-120 -translate-x-1/2 -translate-y-1/2 text-foreground/5"
      />
      {Icon && (
        <span className="relative mb-5 grid size-12 place-items-center rounded-2xl bg-highlight text-highlight-foreground shadow-glow">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      )}
      <h3 className="relative type-h2">{title}</h3>
      {description && (
        <p className="relative mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}
