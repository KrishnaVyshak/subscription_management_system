import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { BrandSection } from './BrandSection';
import { ComponentsSection } from './ComponentsSection';
import { componentIndex } from './contents';
import { FoundationsSection } from './FoundationsSection';
import { PatternsSection } from './PatternsSection';

const contents = [
  { href: '#brand', number: '00', label: 'Brand' },
  { href: '#foundations', number: '01', label: 'Foundations' },
  { href: '#components', number: '02', label: 'Components', children: componentIndex },
  { href: '#patterns', number: '03', label: 'Patterns' },
];

const specs = [
  ['Type', 'Archivo · JetBrains Mono'],
  ['Colour', 'Stone, Ink, Cobalt'],
  ['Shape', '3px corners, ruled edges'],
  ['Themes', 'Light and dark, AA contrast'],
];

function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b bg-card">
      <div className="mx-auto flex h-14 max-w-[90rem] items-center gap-3 px-4 sm:px-8">
        <Link
          to="/design-system"
          className="rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <Logo />
        </Link>
        <span aria-hidden="true" className="hidden h-4 w-px bg-border sm:block" />
        <span className="hidden type-label text-muted-foreground sm:inline">Design system</span>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <Button as={Link} to="/" variant="tertiary" size="sm" className="hidden sm:inline-flex">
            <ArrowLeft /> Back to app
          </Button>
        </div>
      </div>
      {/* Below lg the contents rail collapses into a scrollable strip under the bar. */}
      <nav aria-label="Sections" className="border-t lg:hidden">
        <ul className="mx-auto flex max-w-[90rem] gap-5 overflow-x-auto px-4 sm:px-8">
          {contents.map(({ href, number, label }) => (
            <li key={href} className="shrink-0">
              <a
                href={href}
                className="flex h-10 items-center gap-1.5 text-[0.8125rem] text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground focus-visible:underline"
              >
                <span className="font-mono text-[0.6875rem] text-subtle-foreground">{number}</span>
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

function Contents() {
  const link =
    'block rounded-sm py-1 text-[0.8125rem] text-muted-foreground outline-none transition-colors duration-100 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring';
  return (
    <nav
      aria-label="Contents"
      className="sticky top-14 hidden max-h-[calc(100vh-3.5rem)] overflow-y-auto py-10 lg:block"
    >
      <p className="type-label text-subtle-foreground">Contents</p>
      <ol className="mt-4 space-y-3">
        {contents.map(({ href, number, label, children }) => (
          <li key={href}>
            <a href={href} className={`${link} flex gap-2.5 font-medium text-foreground`}>
              <span className="font-mono text-[0.6875rem] leading-5 text-subtle-foreground">
                {number}
              </span>
              {label}
            </a>
            {children && (
              <ul className="mt-1 ml-[0.4rem] border-l pl-[1.15rem]">
                {children.map((c) => (
                  <li key={c.id}>
                    <a href={`#${c.id}`} className={link}>
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Masthead() {
  return (
    <header className="pt-10 pb-16 sm:pt-16 sm:pb-20">
      <p className="type-label text-muted-foreground">Brightloop · Ledger design system · v3</p>
      <h1 className="mt-6 max-w-4xl type-display">
        Billing, kept <span className="text-accent">in order.</span>
      </h1>
      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
          The visual language for Brightloop’s subscription, invoicing and finance tools. It borrows
          from the printed statement: sheets on a stone desk, figures in a typewriter face, and
          rules instead of boxes. One colour, Cobalt, is reserved for where your attention should go
          next.
        </p>
        <dl className="divide-y border-y border-t-rule text-[0.8125rem]">
          {specs.map(([term, value]) => (
            <div key={term} className="grid grid-cols-[6rem_1fr] gap-4 py-2.5">
              <dt className="type-label leading-5 text-muted-foreground">{term}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </header>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="mx-auto grid max-w-[90rem] grid-cols-[minmax(0,1fr)] gap-x-14 px-4 sm:px-8 lg:grid-cols-[11rem_minmax(0,1fr)]">
        <Contents />
        <main className="min-w-0">
          <Masthead />
          <BrandSection />
          <FoundationsSection />
          <ComponentsSection />
          <PatternsSection />
          <footer className="mt-24 flex flex-wrap items-center justify-between gap-4 border-t-2 border-rule py-6 type-caption text-muted-foreground">
            <Logo />
            <p>
              Tokens in <code className="font-mono">src/index.css</code> · Components in{' '}
              <code className="font-mono">src/components/ui</code>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
