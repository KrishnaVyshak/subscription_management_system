import { LogoMark, Wordmark } from '@/components/brand/logo';
import { cn } from '@/lib/utils';
import { Section, Specimen } from './layout';

const principles = [
  {
    title: 'Ruled, not boxed',
    body: 'Structure comes from lines and alignment. A border earns its place by separating things a reader must tell apart; a shadow only appears when something truly floats.',
  },
  {
    title: 'Every rupee accounted for',
    body: 'Figures are set in mono with tabular numerals, align right and never round silently. If a number is compact (₹12.5L), the exact value is one hover away.',
  },
  {
    title: 'One colour for attention',
    body: 'Ink carries the work. Cobalt marks focus, links and the one figure a screen is about. If two things on a screen are blue, one of them is wrong.',
  },
];

const palette = [
  {
    name: 'Stone',
    hex: '#E9E9E3',
    role: 'The desk every sheet sits on.',
    swatch: 'bg-stone-200 text-stone-900',
  },
  {
    name: 'Sheet',
    hex: '#FBFBF9',
    role: 'Panels, tables, inputs.',
    swatch: 'bg-stone-50 text-stone-900 ring-1 ring-stone-300 ring-inset',
  },
  {
    name: 'Ink',
    hex: '#1B1C18',
    role: 'Text, rules and primary actions.',
    swatch: 'bg-stone-900 text-stone-50',
  },
  {
    name: 'Cobalt',
    hex: '#3349D6',
    role: 'Focus, links, selection. Nothing else.',
    swatch: 'bg-cobalt-600 text-stone-50',
  },
];

// Rough share of a typical screen; the bar is the rule made visible.
const proportion = [
  { name: 'Stone', pct: 48, cls: 'bg-stone-200 ring-1 ring-stone-300 ring-inset' },
  { name: 'Sheet', pct: 34, cls: 'bg-stone-50 ring-1 ring-stone-300 ring-inset' },
  { name: 'Ink', pct: 15, cls: 'bg-stone-900' },
  { name: 'Cobalt', pct: 3, cls: 'bg-cobalt-600' },
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

function LogoPlate({ className, label, children }) {
  return (
    <figure className="flex flex-col">
      <div className={cn('grid h-36 place-items-center rounded-lg', className)}>{children}</div>
      <figcaption className="mt-2 type-caption text-muted-foreground">{label}</figcaption>
    </figure>
  );
}

export function BrandSection() {
  return (
    <Section
      id="brand"
      number="00"
      title="Brand"
      description="Brightloop runs the money that arrives every month. The brand should feel like a well-kept ledger: exact, calm, and quietly confident that the numbers add up."
    >
      <Specimen title="Principles" sheet={false}>
        <ol className="grid gap-x-8 md:grid-cols-3">
          {principles.map(({ title, body }, i) => (
            <li key={title} className="border-t border-rule py-4">
              <p className="font-mono text-xs text-subtle-foreground">
                {String(i + 1).padStart(2, '0')}
              </p>
              <h4 className="mt-3 type-h2">{title}</h4>
              <p className="mt-2 text-[0.8125rem] text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </Specimen>

      <Specimen
        title="Logo"
        note="A loop that renews itself around a bright core: the subscription that keeps going"
        sheet={false}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <LogoPlate label="Primary lockup" className="bg-stone-900 text-stone-50">
            <span className="inline-flex items-center gap-3">
              <LogoMark tone="paper" className="size-10" />
              <Wordmark className="text-[1.75rem]" />
            </span>
          </LogoPlate>
          <LogoPlate label="On sheet" className="border bg-stone-50 text-stone-900">
            <span className="inline-flex items-center gap-2.5">
              <LogoMark tone="ink" className="size-8" />
              <Wordmark className="text-xl" />
            </span>
          </LogoPlate>
          <LogoPlate label="App icon" className="bg-cobalt-600 sm:col-span-2 lg:col-span-1">
            <LogoMark tone="cobalt" className="size-16 rounded-[6px] ring-1 ring-white/25" />
          </LogoPlate>
        </div>
      </Specimen>

      <Specimen title="Colour" note="Four colours, in roughly this proportion">
        <ul className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          {palette.map(({ name, hex, role, swatch }) => (
            <li key={name}>
              <div className={cn('flex h-28 flex-col justify-between rounded-md p-3', swatch)}>
                <span className="text-lg font-semibold [font-stretch:115%]">{name}</span>
                <span className="font-mono text-xs opacity-75">{hex}</span>
              </div>
              <p className="mt-2 type-caption text-muted-foreground">{role}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 border-t pt-5">
          <div className="flex h-2.5 gap-0.5">
            {proportion.map(({ name, pct, cls }) => (
              <div key={name} className={cls} style={{ flexGrow: pct, flexBasis: 0 }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.6875rem] text-muted-foreground">
            {proportion.map(({ name, pct, cls }) => (
              <li key={name} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn('size-2', cls)} />
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
        <table className="w-full text-[0.8125rem]">
          <thead>
            <tr className="border-b border-b-rule text-left">
              <th
                scope="col"
                className="w-1/2 px-4 pt-3 pb-2 type-label text-success-soft-foreground sm:px-6"
              >
                Write
              </th>
              <th
                scope="col"
                className="px-4 pt-3 pb-2 type-label text-danger-soft-foreground sm:px-6"
              >
                Not
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {voice.map(({ good, bad }) => (
              <tr key={good} className="align-top">
                <td className="px-4 py-3.5 sm:px-6">{good}</td>
                <td className="px-4 py-3.5 text-muted-foreground line-through decoration-muted-foreground/40 sm:px-6">
                  {bad}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Specimen>
    </Section>
  );
}
