import { cn } from '@/lib/utils';

/** A numbered chapter: opens on a heavy Ink rule, like a new page of a statement. */
export function Section({ id, number, title, description, children }) {
  const headingId = `${id}-title`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-20 pt-20 first:pt-0">
      <header className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-3 border-t-2 border-rule pt-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <h2 id={headingId} className="flex items-baseline gap-3 type-h1">
          <span className="font-mono text-sm font-medium tracking-normal text-subtle-foreground">
            {number}
          </span>
          {title}
        </h2>
        {description && (
          <p className="max-w-xl text-[0.9375rem] leading-relaxed text-muted-foreground lg:pt-1.5">
            {description}
          </p>
        )}
      </header>
      <div className="mt-6 divide-y">{children}</div>
    </section>
  );
}

/**
 * One labelled example, laid out like a spec sheet: name and note in a narrow column, the live
 * rendering beside it. `wide` stacks them for examples that need the full measure.
 * `sheet` puts the rendering on a card surface; leave it off when the example brings its own.
 */
export function Specimen({ id, title, note, wide = false, sheet = true, className, children }) {
  return (
    <article
      id={id}
      className={cn(
        'grid scroll-mt-20 grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-4 py-8',
        !wide && 'xl:grid-cols-[11rem_minmax(0,1fr)]',
      )}
    >
      <header className={cn(wide && 'flex flex-wrap items-baseline justify-between gap-x-6')}>
        <h3 className="type-h3">{title}</h3>
        {note && <p className="mt-1 type-caption text-muted-foreground">{note}</p>}
      </header>
      <div className={cn('min-w-0', sheet && 'rounded-lg border bg-card p-4 sm:p-6', className)}>
        {children}
      </div>
    </article>
  );
}

export function Code({ children }) {
  return (
    <code className="rounded-sm bg-muted px-1 py-px font-mono text-[0.75rem] text-foreground">
      {children}
    </code>
  );
}
