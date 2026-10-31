import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/brand/logo';
import { LoopPattern } from '@/components/brand/loop-pattern';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { BrandSection } from './BrandSection';
import { ComponentsSection } from './ComponentsSection';
import { FoundationsSection } from './FoundationsSection';
import { PatternsSection } from './PatternsSection';

const nav = [
  { href: '#brand', label: 'Brand' },
  { href: '#foundations', label: 'Foundations' },
  { href: '#components', label: 'Components' },
  { href: '#patterns', label: 'Patterns' },
];

const facts = [
  ['4', 'brand colours'],
  ['20', 'components'],
  ['2', 'themes, one brand'],
  ['AA', 'contrast throughout'],
];

function Hero() {
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-ink-900 px-6 py-14 text-paper sm:px-14 sm:py-20 dark:ring-1 dark:ring-white/10">
      <LoopPattern
        rings={9}
        spark
        className="absolute top-1/2 -right-56 -z-10 size-176 -translate-y-1/2 text-white/8 max-sm:-right-80 max-sm:opacity-60"
      />
      <div className="absolute -right-24 -bottom-40 -z-10 size-112 rounded-full bg-tide-500/30 blur-3xl" />
      <div className="absolute top-10 right-1/3 -z-10 size-40 rounded-full bg-volt-300/10 blur-3xl" />

      <p className="flex items-center gap-2 type-overline text-volt-300">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-volt-300" />
        Brightloop design system · v2
      </p>
      <h1 className="mt-6 max-w-3xl type-display">
        Billing that <em className="text-volt-300">keeps its promises.</em>
      </h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-white/65">
        The visual language for Brightloop’s subscription, invoicing and finance tools: Ink and
        Paper for calm, Tide for every action, and one bright spark of Volt where it matters.
      </p>
      <div className="mt-9 flex flex-wrap gap-3">
        <Button as="a" href="#components" variant="accent" size="lg">
          Explore components <ArrowRight />
        </Button>
        <Button
          as="a"
          href="#brand"
          variant="ghost"
          size="lg"
          className="text-white ring-1 ring-white/20 hover:bg-white/10"
        >
          Brand guidelines
        </Button>
      </div>

      <dl className="mt-14 grid max-w-2xl grid-cols-2 gap-y-6 border-t border-white/10 pt-8 sm:grid-cols-4">
        {facts.map(([value, label]) => (
          <div key={label}>
            <dt className="sr-only">{label}</dt>
            <dd>
              <span className="block font-serif text-4xl leading-none font-light">{value}</span>
              <span className="mt-1.5 block text-xs text-white/55">{label}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-8">
          <Link
            to="/design-system"
            className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Logo />
          </Link>
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {nav.map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Button as={Link} to="/" variant="ghost" size="sm" className="hidden sm:inline-flex">
              <ArrowLeft /> Back to app
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-24 px-4 py-8 sm:px-8 sm:py-10">
        <Hero />
        <BrandSection />
        <FoundationsSection />
        <ComponentsSection />
        <PatternsSection />
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t py-10 text-sm text-muted-foreground">
          <Logo />
          <p>Tokens in src/index.css · Components in src/components/ui</p>
        </footer>
      </main>
    </div>
  );
}
