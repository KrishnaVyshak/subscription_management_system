import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

const options = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

export function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={cn('inline-flex items-center gap-px rounded-md border bg-sunken p-0.5', className)}
    >
      {options.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            'grid size-7 cursor-pointer place-items-center rounded-sm text-muted-foreground transition-colors duration-100 outline-none hover:text-foreground',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
            theme === value && 'bg-card text-foreground shadow-[0_0_0_1px_var(--border)]',
          )}
        >
          <Icon aria-hidden="true" className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
