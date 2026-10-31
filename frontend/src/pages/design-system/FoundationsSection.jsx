import { cn } from '@/lib/utils';
import { Code, Section, Specimen } from './layout';

// Class names are written out in full so Tailwind's scanner picks them up.
const scales = [
  {
    name: 'Stone',
    steps: [
      ['50', 'bg-stone-50'],
      ['100', 'bg-stone-100'],
      ['200', 'bg-stone-200'],
      ['300', 'bg-stone-300'],
      ['400', 'bg-stone-400'],
      ['500', 'bg-stone-500'],
      ['600', 'bg-stone-600'],
      ['700', 'bg-stone-700'],
      ['800', 'bg-stone-800'],
      ['900', 'bg-stone-900'],
    ],
  },
  {
    name: 'Cobalt',
    steps: [
      ['50', 'bg-cobalt-50'],
      ['100', 'bg-cobalt-100'],
      ['200', 'bg-cobalt-200'],
      ['300', 'bg-cobalt-300'],
      ['400', 'bg-cobalt-400'],
      ['500', 'bg-cobalt-500'],
      ['600', 'bg-cobalt-600'],
      ['700', 'bg-cobalt-700'],
      ['800', 'bg-cobalt-800'],
      ['900', 'bg-cobalt-900'],
    ],
  },
];

const surfaces = [
  { token: 'background', swatch: 'bg-background', use: 'Stone canvas behind everything' },
  { token: 'card', swatch: 'bg-card', use: 'Sheets: panels, tables, inputs' },
  { token: 'sunken', swatch: 'bg-sunken', use: 'Wells, segmented controls, footers' },
  { token: 'primary', swatch: 'bg-primary', use: 'Ink: primary actions, rules' },
  { token: 'accent', swatch: 'bg-accent', use: 'Cobalt: focus, links, selection' },
  { token: 'accent-soft', swatch: 'bg-accent-soft', use: 'Selected rows, info tint' },
  { token: 'inverse', swatch: 'bg-inverse', use: 'Toasts, tooltips' },
  { token: 'border', swatch: 'bg-border', use: 'Hairlines between rows' },
  { token: 'input', swatch: 'bg-input', use: 'Control edges' },
];

const statuses = [
  {
    name: 'success',
    solid: 'bg-success',
    soft: 'bg-success-soft text-success-soft-foreground',
    use: 'Active, paid, up',
  },
  {
    name: 'warning',
    solid: 'bg-warning',
    soft: 'bg-warning-soft text-warning-soft-foreground',
    use: 'Paused, due soon',
  },
  {
    name: 'danger',
    solid: 'bg-danger',
    soft: 'bg-danger-soft text-danger-soft-foreground',
    use: 'Cancelled, failed, overdue',
  },
  {
    name: 'info',
    solid: 'bg-info',
    soft: 'bg-info-soft text-info-soft-foreground',
    use: 'Quotation, notices',
  },
];

const chartSlots = [
  ['bg-chart-1', 'Cobalt'],
  ['bg-chart-2', 'Saffron'],
  ['bg-chart-3', 'Stone'],
];

// Archivo's width axis is the display voice: the larger the text, the wider it sets.
const widths = [
  { stretch: '[font-stretch:100%]', value: '100%', role: 'Body, labels, controls' },
  { stretch: '[font-stretch:108%]', value: '108%', role: 'Section headings' },
  { stretch: '[font-stretch:115%]', value: '115%', role: 'Page titles' },
  { stretch: '[font-stretch:125%]', value: '125%', role: 'Display, wordmark' },
];

const typeScale = [
  {
    name: 'Display',
    cls: 'type-display',
    spec: 'Archivo 650 · 125% · 40–80 fluid',
    sample: 'In order.',
  },
  {
    name: 'Heading 1',
    cls: 'type-h1',
    spec: 'Archivo 620 · 115% · 26–32',
    sample: 'Subscriptions',
  },
  {
    name: 'Heading 2',
    cls: 'type-h2',
    spec: 'Archivo 600 · 108% · 18/24',
    sample: 'Billing schedule',
  },
  { name: 'Heading 3', cls: 'type-h3', spec: 'Archivo 600 · 14/20', sample: 'Payment method' },
  {
    name: 'Figure large',
    cls: 'type-figure-lg',
    spec: 'JetBrains Mono 500 · 32–44 · tabular',
    sample: '₹12,45,000',
  },
  { name: 'Figure', cls: 'type-figure', spec: 'JetBrains Mono 500 · 28 · tabular', sample: '1,284' },
  {
    name: 'Body',
    cls: 'type-body',
    spec: 'Archivo 400 · 14/22',
    sample: 'Renews automatically on the 12th of every month unless paused.',
  },
  {
    name: 'Caption',
    cls: 'type-caption text-muted-foreground',
    spec: 'Archivo 400 · 12/17',
    sample: 'Last checked 2 minutes ago',
  },
  {
    name: 'Label',
    cls: 'type-label text-muted-foreground',
    spec: 'JetBrains Mono 500 · 11 · caps',
    sample: 'Next invoice',
  },
];

const spacing = [
  ['1', 4],
  ['2', 8],
  ['3', 12],
  ['4', 16],
  ['6', 24],
  ['8', 32],
  ['12', 48],
  ['20', 80],
];

const radii = [
  ['none', 'rounded-none', 'Meters, table cells'],
  ['sm', 'rounded-sm', 'Badges, checkboxes'],
  ['md', 'rounded-md', 'Buttons, inputs'],
  ['lg', 'rounded-lg', 'Sheets, panels'],
  ['xl', 'rounded-xl', 'Dialogs'],
];

const edges = [
  { name: 'Hairline', cls: 'border', use: 'Between rows, around sheets' },
  { name: 'Control', cls: 'border border-input', use: 'Inputs, secondary buttons' },
  { name: 'Rule', cls: 'border-t-2 border-rule', use: 'Starts a section or a table' },
  { name: 'Overlay', cls: 'border shadow-overlay', use: 'Dialogs, toasts. Nothing else' },
];

export function FoundationsSection() {
  return (
    <Section
      id="foundations"
      number="01"
      title="Foundations"
      description="Tokens live in src/index.css. Components only use semantic tokens, so switching theme or re-tuning the brand is a token change, not a rewrite. Toggle the theme in the header to watch every value move."
    >
      <Specimen
        title="Scales"
        note="Raw steps for brand moments. In components, use semantic tokens"
      >
        <div className="space-y-6">
          {scales.map(({ name, steps }) => (
            <div key={name} className="grid gap-2 sm:grid-cols-[5rem_1fr] sm:items-start">
              <p className="pt-1 text-[0.8125rem] font-semibold">{name}</p>
              <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
                {steps.map(([step, cls]) => (
                  <div key={step}>
                    <div
                      className={cn('h-10 rounded-sm ring-1 ring-foreground/8 ring-inset', cls)}
                    />
                    <p className="mt-1 font-mono text-[0.625rem] text-muted-foreground">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen title="Semantic tokens">
        <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {surfaces.map(({ token, swatch, use }) => (
            <li key={token} className="flex items-center gap-3">
              <span
                className={cn(
                  'size-8 shrink-0 rounded-sm ring-1 ring-foreground/12 ring-inset',
                  swatch,
                )}
              />
              <span className="min-w-0">
                <span className="block font-mono text-xs font-medium">{token}</span>
                <span className="block truncate type-caption text-muted-foreground">{use}</span>
              </span>
            </li>
          ))}
        </ul>
      </Specimen>

      <Specimen title="Status" note="Reserved for state; always with a label">
        <div className="grid gap-8 lg:grid-cols-2">
          <ul className="divide-y">
            {statuses.map(({ name, solid, soft, use }) => (
              <li key={name} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                <span className={cn('size-2.5 shrink-0', solid)} />
                <span
                  className={cn(
                    'flex h-6 w-20 shrink-0 items-center rounded-sm px-2 type-label',
                    soft,
                  )}
                >
                  {name}
                </span>
                <span className="type-caption text-muted-foreground">{use}</span>
              </li>
            ))}
          </ul>
          <div>
            <p className="type-label text-muted-foreground">Data series</p>
            <div className="mt-3 flex gap-1">
              {chartSlots.map(([cls, name], i) => (
                <div key={cls} className="flex-1">
                  <div className={cn('h-10', cls)} />
                  <p className="mt-1.5 text-xs font-medium">{name}</p>
                  <p className="font-mono text-[0.625rem] text-muted-foreground">chart-{i + 1}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 type-caption text-muted-foreground">
              Fixed order, three series at most; fold the rest into “Other”. Status colours are
              never series colours.
            </p>
          </div>
        </div>
      </Specimen>

      <Specimen title="Typeface" note="Archivo widens as it grows; JetBrains Mono sets every figure">
        <div className="grid gap-px overflow-hidden rounded-md border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {widths.map(({ stretch, value, role }) => (
            <div key={value} className="bg-card p-4">
              <p className={cn('text-4xl leading-none font-semibold tracking-[-0.035em]', stretch)}>
                Ag
              </p>
              <p className="mt-4 font-mono text-xs">wdth {value}</p>
              <p className="type-caption text-muted-foreground">{role}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 font-mono text-2xl tracking-[-0.03em] tabular-nums">
          ₹ 0123456789 <span className="text-muted-foreground">INV-2208 · SUB-1042</span>
        </p>
      </Specimen>

      <Specimen title="Type scale" className="py-2 sm:py-2">
        <ul className="divide-y">
          {typeScale.map(({ name, cls, spec, sample }) => (
            <li
              key={name}
              className="grid gap-2 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-baseline sm:gap-6"
            >
              <div>
                <p className="text-[0.8125rem] font-medium">{name}</p>
                <p className="font-mono text-[0.6875rem] text-link">.{cls.split(' ')[0]}</p>
                <p className="text-[0.6875rem] text-muted-foreground">{spec}</p>
              </div>
              <p className={cn('min-w-0 truncate', cls)}>{sample}</p>
            </li>
          ))}
        </ul>
      </Specimen>

      <Specimen title="Spacing" note="A 4px base. Most screens need only 2, 3, 4 and 6">
        <ul className="space-y-1.5">
          {spacing.map(([step, px]) => (
            <li key={step} className="grid grid-cols-[2.5rem_3rem_1fr] items-center gap-3">
              <span className="font-mono text-xs">{step}</span>
              <span className="font-mono text-xs text-muted-foreground">{px}px</span>
              <span className="h-2.5 bg-accent/70" style={{ width: px }} />
            </li>
          ))}
        </ul>
      </Specimen>

      <Specimen
        title="Shape"
        note={
          <>
            Nearly square, derived from <Code>--radius</Code> (3px)
          </>
        }
      >
        <ul className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {radii.map(([name, cls, use]) => (
            <li key={name}>
              <div className={cn('h-12 border-2 border-foreground bg-sunken', cls)} />
              <p className="mt-1.5 font-mono text-xs">{name}</p>
              <p className="text-[0.6875rem] leading-tight text-muted-foreground">{use}</p>
            </li>
          ))}
        </ul>
      </Specimen>

      <Specimen
        title="Edges & elevation"
        note="Lines do the work; one shadow, for overlays"
        className="bg-sunken"
      >
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {edges.map(({ name, cls, use }) => (
            <li key={name}>
              <div className={cn('h-14 rounded-sm bg-card', cls)} />
              <p className="mt-2 text-xs font-medium">{name}</p>
              <p className="text-[0.6875rem] text-muted-foreground">{use}</p>
            </li>
          ))}
        </ul>
      </Specimen>
    </Section>
  );
}
