import { Check, X } from 'lucide-react';
import { passwordChecks } from '@brightloop/shared';
import { cn } from '@/lib/utils';

/** Live ✓/✗ for each password rule (the same rules the backend enforces). */
export function PasswordChecklist({ value = '', id, className }) {
  return (
    <ul id={id} aria-label="Password requirements" className={cn('grid gap-1 sm:grid-cols-2', className)}>
      {passwordChecks.map((check) => {
        const ok = check.test(value);
        const Icon = ok ? Check : X;
        return (
          <li
            key={check.id}
            data-ok={ok}
            className={cn(
              'flex items-center gap-1.5 type-caption',
              ok ? 'text-success-soft-foreground' : 'text-muted-foreground',
            )}
          >
            <Icon aria-hidden="true" className={cn('size-3.5 shrink-0', ok ? 'text-success' : 'text-subtle-foreground')} strokeWidth={2.5} />
            {check.label}
            <span className="sr-only">{ok ? '(met)' : '(not met)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
