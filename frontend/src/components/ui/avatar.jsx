import { cn } from '@/lib/utils';

// Identity colours, not status: picked by name so a customer keeps the same colour everywhere.
const palettes = [
  'bg-cobalt-100 text-cobalt-800 dark:bg-cobalt-400/20 dark:text-cobalt-100',
  'bg-orange-100 text-orange-900 dark:bg-orange-400/15 dark:text-orange-200',
  'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200',
  'bg-rose-100 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200',
  'bg-stone-200 text-stone-800 dark:bg-stone-600/50 dark:text-stone-100',
  'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200',
];

const sizes = {
  sm: 'size-6 text-[0.625rem]',
  md: 'size-8 text-[0.6875rem]',
  lg: 'size-10 text-xs',
};

function initials(name) {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts.length > 1 ? parts.at(-1)[0] : '')).toUpperCase();
}

function paletteFor(name) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return palettes[hash % palettes.length];
}

export function Avatar({ name, src, size = 'md', className }) {
  const shared = cn('inline-flex shrink-0 rounded-md', sizes[size], className);
  if (src) return <img src={src} alt={name} className={cn(shared, 'object-cover')} />;
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(shared, 'items-center justify-center font-mono font-medium', paletteFor(name))}
    >
      {initials(name)}
    </span>
  );
}
