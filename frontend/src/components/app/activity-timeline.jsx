import { ArrowRight } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDateTime } from '@/lib/format';

/** Status history, newest first: from → to, who, when, and the note. */
export function ActivityTimeline({ items = [], empty = 'No activity yet.' }) {
  if (!items.length) return <p className="py-4 type-caption text-muted-foreground">{empty}</p>;
  const sorted = [...items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return (
    <ol className="relative ml-1.5 border-l py-1">
      {sorted.map((h) => (
        <li key={h.id} className="relative pb-5 pl-5 last:pb-1">
          <span aria-hidden="true" className="absolute top-1.5 -left-[4.5px] size-2 bg-foreground" />
          <div className="flex flex-wrap items-center gap-1.5">
            {h.fromStatus ? (
              <>
                <StatusBadge status={h.fromStatus} />
                <ArrowRight aria-label="to" className="size-3.5 text-subtle-foreground" />
              </>
            ) : (
              <span className="text-[0.8125rem] text-muted-foreground">Created as</span>
            )}
            <StatusBadge status={h.toStatus} />
          </div>
          <p className="mt-1 font-mono text-xs text-muted-foreground">
            {formatDateTime(h.createdAt)} · {h.changedByName ?? 'System'}
          </p>
          {h.note && <p className="mt-1 text-[0.8125rem]">{h.note}</p>}
        </li>
      ))}
    </ol>
  );
}
