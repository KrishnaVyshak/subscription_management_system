import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { Toaster } from 'sonner';
import { cn } from '@/lib/utils';
import { Spinner } from './ui/spinner';

// Short enough to feel brisk; hovering a toast pauses it, so longer copy can still be read.
const DURATION_MS = 3000;

// Same tinted chip as Alert, so a toast reads as the same family.
const chip = (Icon, tone) => (
  <span className={cn('grid size-7 place-items-center rounded-full', tone)}>
    <Icon aria-hidden="true" className="size-4" />
  </span>
);

const icons = {
  // Solid Volt with Ink: Volt is never text on a light surface.
  success: chip(CircleCheck, 'bg-highlight text-highlight-foreground'),
  error: chip(CircleAlert, 'bg-danger-soft text-danger-soft-foreground'),
  warning: chip(TriangleAlert, 'bg-warning-soft text-warning-soft-foreground'),
  info: chip(Info, 'bg-info-soft text-info-soft-foreground'),
  loading: chip(Spinner, 'bg-muted text-muted-foreground'),
};

// `unstyled` drops Sonner's look but keeps its stacking and motion (timings tuned in index.css).
// A popover card on semantic tokens, so it follows the app theme like every other surface.
const classNames = {
  toast:
    'flex w-(--width) items-start gap-3 rounded-2xl border bg-popover p-3 pr-3.5 font-sans text-popover-foreground shadow-overlay',
  icon: 'shrink-0',
  content: 'min-w-0 flex-1 pt-1',
  title: 'text-sm leading-5 font-medium',
  description: 'mt-0.5 text-[0.8125rem] leading-5 text-muted-foreground',
  actionButton:
    'h-7 shrink-0 cursor-pointer self-center rounded-full bg-highlight px-3 text-xs font-medium text-highlight-foreground outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring',
  cancelButton:
    'h-7 shrink-0 cursor-pointer self-center rounded-full px-3 text-xs font-medium text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
};

export function ThemedToaster(props) {
  return (
    <Toaster
      icons={icons}
      gap={10}
      toastOptions={{ unstyled: true, duration: DURATION_MS, classNames }}
      {...props}
    />
  );
}
