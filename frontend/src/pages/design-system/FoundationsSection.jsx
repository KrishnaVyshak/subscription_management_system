import { cn } from '@/lib/utils';
import { Code, Section, Specimen } from './layout';

// Class names are written out in full so Tailwind's scanner picks them up.
const scales = [
  {
    name: 'Ink',
    steps: [
      ['50', 'bg-ink-50'],
      ['100', 'bg-ink-100'],
      ['200', 'bg-ink-200'],
      ['300', 'bg-ink-300'],
      ['400', 'bg-ink-400'],
      ['500', 'bg-ink-500'],
      ['600', 'bg-ink-600'],
      ['700', 'bg-ink-700'],
      ['800', 'bg-ink-800'],
      ['900', 'bg-ink-900'],
    ],
  },
  {
    name: 'Tide',
    steps: [
      ['50', 'bg-tide-50'],
      ['100', 'bg-tide-100'],
      ['200', 'bg-tide-200'],
      ['300', 'bg-tide-300'],
      ['400', 'bg-tide-400'],
      ['500', 'bg-tide-500'],
      ['600', 'bg-tide-600'],
      ['700', 'bg-tide-700'],
      ['800', 'bg-tide-800'],
      ['900', 'bg-tide-900'],
    ],
  },
  {
    name: 'Volt',
    steps: [
      ['50', 'bg-volt-50'],
      ['100', 'bg-volt-100'],
      ['200', 'bg-volt-200'],
      ['300', 'bg-volt-300'],
      ['400', 'bg-volt-400'],
      ['500', 'bg-volt-500'],
      ['600', 'bg-volt-600'],
      ['700', 'bg-volt-700'],
      ['800', 'bg-volt-800'],
      ['900', 'bg-volt-900'],
    ],
  },
];

const surfaces = [
  { token: 'background', swatch: 'bg-background', use: 'Paper canvas behind everything' },
  { token: 'card', swatch: 'bg-card', use: 'Cards, tables, inputs' },
  { token: 'muted', swatch: 'bg-muted', use: 'Wells, table headers, disabled' },
  { token: 'primary', swatch: 'bg-primary', use: 'Tide: actions, links, focus' },
  { token: 'highlight', swatch: 'bg-highlight', use: 'Volt: the one thing to notice' },
  { token: 'accent', swatch: 'bg-accent', use: 'Tide tint: selected, active' },
  { token: 'sidebar', swatch: 'bg-sidebar', use: 'Ink navigation rail, both themes' },
  { token: 'border', swatch: 'bg-border', use: 'Hairlines and card edges' },
  { token: 'muted-foreground', swatch: 'bg-muted-foreground', use: 'Labels, hints, metadata' },
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
  ['bg-chart-1', 'Tide'],
  ['bg-chart-2', 'Ember'],
  ['bg-chart-3', 'Cobalt'],
];

// The weights loaded in index.html, each tied to the role that uses it. Italics are loaded
// only for 300 and 400, so the others never show one (the browser would fake the slant).
const spectralWeights = [
  { weight: 'font-extralight', value: 200, name: 'ExtraLight', role: 'Ornamental numerals' },
  { weight: 'font-light', value: 300, name: 'Light', role: 'Display, hero facts', italic: true },
  { weight: 'font-normal', value: 400, name: 'Regular', role: 'Titles, statements', italic: true },
  { weight: 'font-medium', value: 500, name: 'Medium', role: 'Figures, labels on colour' },
];

const typeScale = [
  {
    name: 'Display',
    cls: 'type-display',
    spec: 'Spectral 300 · 44–72 fluid',
    sample: (
      <>
        Revenue, <em>on repeat.</em>
      </>
    ),
  },
  { name: 'Heading 1', cls: 'type-h1', spec: 'Spectral 400 · 40/43', sample: 'Subscriptions' },
  {
    name: 'Statement',
    cls: 'type-statement',
    spec: 'Spectral 400 · 28/34 · pull quotes',
    sample: 'Annual billing saves customers two months.',
  },
  {
    name: 'Figure',
    cls: 'type-figure',
    spec: 'Spectral 500 · 38 · tabular',
    sample: '₹12,45,000',
  },
  {
    name: 'Numeral',
    cls: 'type-numeral text-muted-foreground/50',
    spec: 'Spectral 200 · 48 · ornament only',
    sample: '01 02 03',
  },
  { name: 'Heading 2', cls: 'type-h2', spec: 'Geist 600 · 20/28', sample: 'Billing schedule' },
  { name: 'Heading 3', cls: 'type-h3', spec: 'Geist 600 · 15/22', sample: 'Payment method' },
  {
    name: 'Body',
    cls: 'type-body',
    spec: 'Geist 400 · 14/22',
    sample: 'Renews automatically on the 12th of every month unless paused.',
  },
  {
    name: 'Caption',
    cls: 'type-caption text-muted-foreground',
    spec: 'Geist 400 · 12/16',
    sample: 'Last updated 2 minutes ago',
  },
  {
    name: 'Overline',
    cls: 'type-overline text-muted-foreground',
    spec: 'Geist Mono 500 · 11 · caps',
    sample: 'Next invoice',
  },
];

const radii = [
  ['md', 'rounded-md', 'Tags, checkboxes'],
  ['xl', 'rounded-xl', 'Inputs, selects'],
  ['2xl', 'rounded-2xl', 'Cards, alerts'],
  ['3xl', 'rounded-3xl', 'Dialogs, hero'],
  ['full', 'rounded-full', 'Buttons, badges'],
];

const shadows = [
  ['shadow-card', 'Resting cards'],
  ['shadow-lifted', 'Hover, app icon'],
  ['shadow-overlay', 'Dialogs, popovers'],
  ['shadow-glow', 'Volt, sparingly'],
];

export function FoundationsSection() {
  return (
    <Section
      id="foundations"
      eyebrow="01 · Foundations"
      title="Foundations"
      description="Tokens live in src/index.css. Components only use semantic tokens, so switching theme or re-tuning the brand is a token change, not a rewrite. Toggle the theme in the header to watch every value move."
    >
      <Specimen
        title="Scales"
        note={<>Raw steps for brand moments. In components, prefer semantic tokens</>}
      >
        <div className="space-y-6">
          {scales.map(({ name, steps }) => (
            <div key={name} className="grid gap-3 sm:grid-cols-[4rem_1fr] sm:items-center">
              <p className="font-serif text-2xl">{name}</p>
              <div className="grid grid-cols-10 gap-1.5">
                {steps.map(([step, cls]) => (
                  <div key={step}>
                    <div
                      className={cn('h-12 rounded-lg ring-1 ring-foreground/5 ring-inset', cls)}
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
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {surfaces.map(({ token, swatch, use }) => (
            <div key={token} className="flex items-center gap-3">
              <div
                className={cn(
                  'size-11 shrink-0 rounded-xl ring-1 ring-foreground/10 ring-inset',
                  swatch,
                )}
              />
              <div className="min-w-0">
                <p className="font-mono text-xs font-medium">{token}</p>
                <p className="truncate text-xs text-muted-foreground">{use}</p>
              </div>
            </div>
          ))}
        </div>
      </Specimen>

      <div className="grid gap-14 lg:grid-cols-2 lg:gap-8">
        <Specimen title="Status" note="Reserved for state; always with an icon or label">
          <div className="space-y-3">
            {statuses.map(({ name, solid, soft, use }) => (
              <div key={name} className="flex items-center gap-3">
                <div className={cn('size-8 shrink-0 rounded-full', solid)} />
                <div
                  className={cn(
                    'flex h-8 w-28 shrink-0 items-center rounded-full px-3 text-xs font-semibold',
                    soft,
                  )}
                >
                  {name}
                </div>
                <p className="text-xs text-muted-foreground">{use}</p>
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen title="Data" note="Fixed order · colour-blind validated in both themes">
          <div className="flex gap-2">
            {chartSlots.map(([cls, name], i) => (
              <div key={cls} className="flex-1">
                <div className={cn('h-16 rounded-xl', cls)} />
                <p className="mt-1.5 text-xs font-medium">{name}</p>
                <p className="font-mono text-[0.625rem] text-muted-foreground">chart-{i + 1}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Three series at most; fold the rest into “Other”. Volt and status colours are never
            series colours.
          </p>
        </Specimen>
      </div>

      <Specimen title="Spectral" note="Larger means lighter: each role has one weight">
        <div className="grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {spectralWeights.map(({ weight, value, name, role, italic }) => (
            <div key={value} className="bg-card p-5">
              <p className={cn('font-serif text-5xl leading-none', weight)}>
                Aa {italic ? <em>Aa</em> : '₹42'}
              </p>
              <p className="mt-4 text-sm font-medium">
                {name} <span className="font-mono text-xs text-muted-foreground">{value}</span>
              </p>
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>
          ))}
        </div>
      </Specimen>

      <Specimen title="Typography" note="Spectral speaks; Geist works">
        <div className="divide-y">
          {typeScale.map(({ name, cls, spec, sample }) => (
            <div
              key={name}
              className="grid gap-2 py-5 first:pt-0 last:pb-0 sm:grid-cols-[12rem_1fr] sm:items-center sm:gap-8"
            >
              <div>
                <p className="text-sm font-medium">{name}</p>
                <p className="font-mono text-[0.6875rem] text-link">.{cls.split(' ')[0]}</p>
                <p className="text-[0.6875rem] text-muted-foreground">{spec}</p>
              </div>
              <p className={cn('min-w-0 truncate', cls)}>{sample}</p>
            </div>
          ))}
        </div>
      </Specimen>

      <div className="grid gap-14 lg:grid-cols-2 lg:gap-8">
        <Specimen
          title="Shape"
          note={
            <>
              Soft and round, derived from <Code>--radius</Code>
            </>
          }
        >
          <div className="grid grid-cols-5 gap-3">
            {radii.map(([name, cls, use]) => (
              <div key={name}>
                <div
                  className={cn(
                    'h-14 border-2 border-tide-400 bg-tide-50 dark:bg-tide-400/15',
                    cls,
                  )}
                />
                <p className="mt-1.5 text-xs font-medium">{name}</p>
                <p className="text-[0.625rem] leading-tight text-muted-foreground">{use}</p>
              </div>
            ))}
          </div>
        </Specimen>

        <Specimen
          title="Elevation"
          note="Borders do the work; shadows stay soft"
          className="bg-muted/60"
        >
          <div className="grid grid-cols-4 gap-3">
            {shadows.map(([cls, use]) => (
              <div key={cls}>
                <div
                  className={cn(
                    'h-14 rounded-2xl border bg-card',
                    cls === 'shadow-glow' && 'border-transparent bg-highlight',
                    cls,
                  )}
                />
                <p className="mt-2 font-mono text-[0.625rem]">{cls}</p>
                <p className="text-[0.625rem] text-muted-foreground">{use}</p>
              </div>
            ))}
          </div>
        </Specimen>
      </div>
    </Section>
  );
}
