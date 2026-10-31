import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { Toaster } from 'sonner';
import { Spinner } from './ui/spinner';

// Short enough to feel brisk; hovering a toast pauses it, so longer copy can still be read.
const DURATION_MS = 3000;

// Toasts sit on the inverse surface (Ink on a light page, Stone on a dark one), so they read as
// a passing note from the system rather than part of the page. Icons carry the tone.
const icons = {
  success: <CircleCheck aria-hidden="true" className="size-4 text-inverse-success" />,
  error: <CircleAlert aria-hidden="true" className="size-4 text-inverse-danger" />,
  warning: <TriangleAlert aria-hidden="true" className="size-4 text-inverse-warning" />,
  info: <Info aria-hidden="true" className="size-4 text-inverse-accent" />,
  loading: <Spinner label="" className="text-inverse-muted" />,
};

// `unstyled` drops Sonner's look but keeps its stacking and motion (timings tuned in index.css).
const classNames = {
  toast:
    'flex w-(--width) items-start gap-3 rounded-lg bg-inverse px-3.5 py-3 font-sans text-inverse-foreground shadow-overlay',
  icon: 'mt-0.5 shrink-0',
  content: 'min-w-0 flex-1',
  title: 'text-[0.8125rem] leading-5 font-medium',
  description: 'mt-0.5 text-xs leading-[1.125rem] text-inverse-muted',
  actionButton:
    'h-7 shrink-0 cursor-pointer self-center rounded-md bg-inverse-foreground px-2.5 text-xs font-medium text-inverse outline-none hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  cancelButton:
    'h-7 shrink-0 cursor-pointer self-center rounded-md px-2.5 text-xs font-medium text-inverse-muted outline-none hover:text-inverse-foreground focus-visible:outline-2 focus-visible:outline-ring',
};

export function ThemedToaster(props) {
  return (
    <Toaster
      icons={icons}
      gap={8}
      toastOptions={{ unstyled: true, duration: DURATION_MS, classNames }}
      {...props}
    />
  );
}
