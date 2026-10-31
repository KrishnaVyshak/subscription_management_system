import { cn } from '@/lib/utils';

export function Section({ id, eyebrow, title, description, children }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="grid gap-6 border-t pt-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <div>
          <p className="flex items-center gap-2 type-overline text-muted-foreground">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-highlight ring-2 ring-highlight/30"
            />
            {eyebrow}
          </p>
          <h2 className="mt-3 type-h1">{title}</h2>
        </div>
        {description && (
          <p className="max-w-xl self-end text-[0.9375rem] leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="mt-12 space-y-14">{children}</div>
    </section>
  );
}

/** One labelled example: a heading, an optional note, and the live rendering. */
export function Specimen({ title, note, className, children }) {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="type-h3">{title}</h3>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
      <div className={cn('rounded-2xl border bg-card p-6 shadow-card sm:p-8', className)}>
        {children}
      </div>
    </div>
  );
}

export function Code({ children }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.75rem] text-foreground">
      {children}
    </code>
  );
}
