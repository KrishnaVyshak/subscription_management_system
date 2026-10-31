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
        'm-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border bg-popover p-0 text-popover-foreground shadow-overlay',
        'backdrop:bg-black/50 backdrop:backdrop-blur-[2px] open:animate-dialog-in',
        className,
      )}
    >
      <div className="flex items-start gap-4 px-6 pt-6">
        <div className="min-w-0 flex-1">
          {title && (
            <h2 id={titleId} className="type-h2">
              {title}
            </h2>
          )}
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          onClick={onClose}
          className="-mt-1 -mr-2"
        >
          <X />
        </Button>
      </div>
      <div className="px-6 py-5">{children}</div>
      {footer && (
        <div className="flex flex-col-reverse gap-2 rounded-b-3xl border-t bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end">
          {footer}
        </div>
      )}
    </dialog>
  );
}
