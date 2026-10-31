import { cn } from '@/lib/utils';

// Identity colours, not status: picked by name so a customer keeps the same colour everywhere.
const palettes = [
  'bg-tide-100 text-tide-700 dark:bg-tide-400/20 dark:text-tide-200',
  'bg-volt-100 text-volt-800 dark:bg-volt-300/15 dark:text-volt-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200',
  'bg-ink-100 text-ink-700 dark:bg-ink-600/40 dark:text-ink-100',
  'bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200',
];

const sizes = {
  sm: 'size-7 text-[0.6875rem]',
  md: 'size-9 text-xs',
  lg: 'size-11 text-sm',
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
  const shared = cn('inline-flex shrink-0 rounded-full', sizes[size], className);
  if (src) return <img src={src} alt={name} className={cn(shared, 'object-cover')} />;
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(shared, 'items-center justify-center font-semibold', paletteFor(name))}
    >
      {initials(name)}
    </span>
  );
}
