import { Check, X } from 'lucide-react';
import { LogoMark, Wordmark } from '@/components/brand/logo';
import { LoopPattern } from '@/components/brand/loop-pattern';
import { cn } from '@/lib/utils';
import { Section, Specimen } from './layout';

const principles = [
  {
    n: '01',
    title: 'Calm by default',
    body: 'Paper and Ink carry nine-tenths of every screen. Finance is stressful enough; the interface should not add to it.',
  },
  {
    n: '02',
    title: 'Every rupee accounted for',
    body: 'Figures use tabular numerals, align right and never round silently. If a number is compact (₹12.5L), the exact value is one hover away.',
  },
  {
    n: '03',
    title: 'Bright where it matters',
    body: 'Volt marks the one thing to notice: the headline metric, the active route, the next action. Once per view, never as decoration.',
  },
];

const palette = [
  {
    name: 'Paper',
    hex: '#FCFAF6',
    role: 'Canvas. Warm, not clinical.',
    swatch: 'bg-paper text-ink-900 ring-1 ring-ink-900/10 ring-inset',
  },
  {
    name: 'Ink',
    hex: '#13161D',
    role: 'Text, headings and the navigation rail.',
    swatch: 'bg-ink-900 text-paper',
  },
  {
    name: 'Tide',
    hex: '#007171',
    role: 'Primary actions, links, focus, first data series.',
    swatch: 'bg-tide-600 text-white',
  },
  {
    name: 'Volt',
    hex: '#C8F351',
    role: 'The spark. Highlights only, never text.',
    swatch: 'bg-volt-300 text-ink-900',
  },
];

// Rough share of a typical screen; the bar is the rule made visible.
const proportion = [
  { name: 'Paper', pct: 62, cls: 'bg-paper ring-1 ring-ink-900/10 ring-inset' },
  { name: 'Ink', pct: 23, cls: 'bg-ink-900' },
  { name: 'Tide', pct: 12, cls: 'bg-tide-600' },
  { name: 'Volt', pct: 3, cls: 'bg-volt-300' },
];

const voice = [
  {
    good: 'Payment received. ₹5,899 from Aarav Mehta was applied to INV-2208.',
    bad: 'Woohoo! You just got paid! 🎉',
  },
  {
    good: 'Card declined. Ask the customer to update their card, then retry.',
    bad: 'Oops! Something went wrong. Please try again later.',
  },
  {
    good: 'Pause SUB-1042? Billing stops today and resumes on 1 Dec.',
    bad: 'Are you sure you want to do this?',
  },
];

function LogoTile({ className, children, label }) {
  return (
    <figure className="flex flex-col">
      <div
        className={cn(
          'relative grid h-40 place-items-center overflow-hidden rounded-2xl border',
          className,
        )}
      >
        {children}
      </div>
      <figcaption className="mt-2 text-xs text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

export function BrandSection() {
  return (
    <Section
      id="brand"
      eyebrow="00 · Brand"
      title="A brand built on recurring trust"
      description="Brightloop runs the money that arrives every month. The brand says the same thing everywhere: reliable like ink on paper, with a single bright spark for the moments that matter."
    >
      <div className="grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
        {principles.map(({ n, title, body }) => (
          <div key={n} className="bg-card p-6 sm:p-8">
            <p className="type-numeral text-muted-foreground/40">{n}</p>
            <h3 className="mt-6 type-h2">{title}</h3>
            <p className="mt-2 text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <Specimen
        title="Logo"
        note="The open loop is recurring billing; the spark is the moment money moves"
        className="p-4 sm:p-4"
      >
        <div className="grid gap-4 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <LogoTile label="Primary lockup" className="border-transparent bg-ink-900">
            <LoopPattern rings={7} className="absolute -right-24 -bottom-28 size-80 text-white/8" />
            <span className="relative inline-flex items-center gap-3 text-white">
              <LogoMark tone="volt" className="size-11" />
              <Wordmark className="text-[1.75rem]" />
            </span>
          </LogoTile>
          <LogoTile label="On paper" className="bg-paper text-ink-900">
            <span className="inline-flex items-center gap-2.5">
              <LogoMark className="size-9" />
              <Wordmark className="text-xl" />
            </span>
          </LogoTile>
          <LogoTile label="On Volt" className="border-transparent bg-volt-300 text-ink-900">
            <LogoMark className="size-14" />
          </LogoTile>
          <LogoTile label="App icon" className="bg-muted">
            <LogoMark tone="paper" className="size-16 rounded-[18px] shadow-lifted" />
          </LogoTile>
        </div>
      </Specimen>

      <Specimen title="Brand colour" note="Four colours, used in this proportion">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {palette.map(({ name, hex, role, swatch }) => (
            <div key={name}>
              <div className={cn('flex h-36 flex-col justify-between rounded-2xl p-4', swatch)}>
                <span className="font-serif text-3xl font-medium">{name}</span>
                <span className="font-mono text-xs opacity-75">{hex}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{role}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <div className="flex h-3 gap-1">
            {proportion.map(({ name, pct, cls }) => (
              <div
                key={name}
                className={cn('rounded-full', cls)}
                style={{ flexGrow: pct, flexBasis: 0 }}
              />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.6875rem] text-muted-foreground">
            {proportion.map(({ name, pct, cls }) => (
              <li key={name} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn('size-2 rounded-full', cls)} />
                {name} {pct}%
              </li>
            ))}
          </ul>
        </div>
      </Specimen>

      <Specimen
        title="Voice"
        note="Specific, calm, and always says what happens next"
        className="p-0 sm:p-0"
      >
        <div className="divide-y">
          {voice.map(({ good, bad }) => (
            <div key={good} className="grid gap-4 p-6 sm:grid-cols-2 sm:gap-8">
              <p className="flex gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success-soft-foreground">
                  <Check className="size-3" aria-label="Do" />
                </span>
                <span>{good}</span>
              </p>
              <p className="flex gap-3 text-muted-foreground">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-danger-soft text-danger-soft-foreground">
                  <X className="size-3" aria-label="Don't" />
                </span>
                <span className="line-through decoration-muted-foreground/40">{bad}</span>
              </p>
            </div>
          ))}
        </div>
      </Specimen>
    </Section>
  );
}
