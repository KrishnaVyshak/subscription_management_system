import { Children, cloneElement, useId } from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';

/**
 * Label + control + hint/error, with ids and aria wiring handled.
 * The single child (Input, Select, Textarea…) receives id, aria-invalid and aria-describedby.
 */
export function Field({ label, hint, error, required, className, children }) {
  const autoId = useId();
  const child = Children.only(children);
  const id = child.props.id ?? autoId;
  const messageId = `${id}-message`;
  const message = error || hint;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <Label htmlFor={id} required={required}>
          {label}
        </Label>
      )}
      {cloneElement(child, {
        id,
        required,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
      })}
      {message && (
        <p
          id={messageId}
          className={cn('text-xs', error ? 'text-danger' : 'text-muted-foreground')}
        >
          {message}
        </p>
      )}
    </div>
  );
}
