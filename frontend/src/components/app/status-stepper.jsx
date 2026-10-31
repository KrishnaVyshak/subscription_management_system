import { Check, Pause } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { statusLabel } from '@/lib/format';
import { cn } from '@/lib/utils';

const STEPS = ['draft', 'quotation', 'confirmed', 'active', 'closed'];

/**
 * Draft → Quotation → Confirmed → Active → Closed, with the current step marked.
 * Paused is a side state of Active: Active stays current and a Paused stamp hangs off it.
 */
export function StatusStepper({ status, className }) {
  const effective = status === 'paused' ? 'active' : status;
  const current = STEPS.indexOf(effective);

  return (
    <ol aria-label="Subscription progress" className={cn('flex w-full items-start overflow-x-auto pb-1', className)}>
      {STEPS.map((step, i) => {
        const done = i < current || (step === 'closed' && status === 'closed');
        const isCurrent = i === current;
        return (
          <li key={step} className="flex min-w-24 flex-1 flex-col" aria-current={isCurrent ? 'step' : undefined}>
            <div className="flex items-center">
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-sm border font-mono text-[0.6875rem]',
                  done && !isCurrent && 'border-foreground bg-foreground text-background',
                  isCurrent && 'border-accent bg-accent-soft text-accent-soft-foreground ring-2 ring-accent/25',
                  !done && !isCurrent && 'border-input bg-card text-subtle-foreground',
                )}
              >
                {done && !isCurrent ? <Check aria-hidden="true" className="size-3.5" strokeWidth={3} /> : i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span aria-hidden="true" className={cn('mx-1.5 h-px flex-1', i < current ? 'bg-foreground' : 'bg-border')} />
              )}
            </div>
            <span
              className={cn(
                'mt-1.5 text-xs whitespace-nowrap',
                isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground',
              )}
            >
              {statusLabel(step)}
              <span className="sr-only">{isCurrent ? ' (current)' : done ? ' (done)' : ''}</span>
            </span>
            {step === 'active' && status === 'paused' && (
              <Badge tone="warning" className="mt-1 w-fit">
                <Pause aria-hidden="true" className="size-3" /> Paused
              </Badge>
            )}
          </li>
        );
      })}
    </ol>
  );
}
