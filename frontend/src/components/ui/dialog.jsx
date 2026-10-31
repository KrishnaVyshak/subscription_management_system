import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

/**
 * Modal built on native <dialog>: focus trapping, Esc to close and inert background are built in.
 * Controlled by `open`; `onClose` fires on Esc, backdrop click and the close button.
 */
export function Dialog({ open, onClose, title, description, footer, className, children }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal?.();
    if (!open && el.open) el.close?.();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose?.()}
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        'm-auto w-[calc(100%-2rem)] max-w-md rounded-xl border bg-popover p-0 text-popover-foreground shadow-overlay',
        'backdrop:bg-stone-950/45 open:animate-dialog-in',
        className,
      )}
    >
      <header className="flex items-start gap-4 border-b px-5 py-4">
        <div className="min-w-0 flex-1">
          {title && (
            <h2 id={titleId} className="type-h2">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-1 text-[0.8125rem] text-muted-foreground">{description}</p>
          )}
        </div>
        <Button
          variant="tertiary"
          size="icon-sm"
          aria-label="Close"
          onClick={onClose}
          className="-mt-0.5 -mr-1.5"
        >
          <X />
        </Button>
      </header>
      <div className="px-5 py-5">{children}</div>
      {footer && (
        <footer className="flex flex-col-reverse gap-2 border-t bg-sunken/60 px-5 py-3 sm:flex-row sm:justify-end">
          {footer}
        </footer>
      )}
    </dialog>
  );
}
