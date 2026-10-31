import { cn } from '@/lib/utils';

// Ruled like an empty ledger page: the lines say "nothing entered yet" without an illustration.
const ruled =
  'bg-[repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,var(--border)_31px,var(--border)_32px)]';

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-4 rounded-lg border bg-card px-5 py-8 sm:flex-row sm:px-8 sm:py-10',
        ruled,
        className,
      )}
    >
      {Icon && (
        <span className="grid size-10 shrink-0 place-items-center rounded-md border bg-card text-muted-foreground">
          <Icon aria-hidden="true" className="size-[1.125rem]" />
        </span>
      )}
      <div className="max-w-md">
        <h3 className="type-h2">{title}</h3>
        {description && (
          <p className="mt-1 text-[0.8125rem] text-muted-foreground">{description}</p>
        )}
        {action && <div className="mt-5 flex flex-wrap gap-2">{action}</div>}
      </div>
    </div>
  );
}
