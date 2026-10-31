import { useId } from 'react';
import { Controller, get } from 'react-hook-form';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// React Hook Form wrappers over the kit's Field: label, hint and inline error wired for you.
// Each takes `form` (the useForm() return) and `name`.

const errorOf = (form, name) => get(form.formState.errors, name)?.message;

export function TextField({ form, name, label, hint, required, className, registerOptions, ...inputProps }) {
  return (
    <Field label={label} hint={hint} error={errorOf(form, name)} required={required} className={className}>
      <Input {...form.register(name, registerOptions)} {...inputProps} />
    </Field>
  );
}

export function TextareaField({ form, name, label, hint, required, className, ...props }) {
  return (
    <Field label={label} hint={hint} error={errorOf(form, name)} required={required} className={className}>
      <Textarea {...form.register(name)} {...props} />
    </Field>
  );
}

/** options: [{ value, label }]; `placeholder` adds an empty first option. */
export function SelectField({ form, name, label, hint, required, options, placeholder, className, ...props }) {
  return (
    <Field label={label} hint={hint} error={errorOf(form, name)} required={required} className={className}>
      <Select {...form.register(name)} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** Any controlled input (EntityCombobox, LinesEditor…) via render({ value, onChange, … }). */
export function ControlledField({ form, name, label, hint, required, className, render }) {
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <Field label={label} hint={hint} error={errorOf(form, name)} required={required} className={className}>
          {render(field)}
        </Field>
      )}
    />
  );
}

/** A switch with a bold label and a one-line explanation beside it. */
export function SwitchField({ form, name, label, description, disabled, className }) {
  const id = useId();
  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field }) => (
        <div className={cn('flex items-start gap-2.5 text-[0.8125rem] leading-5', className)}>
          <Switch
            id={id}
            checked={Boolean(field.value)}
            onCheckedChange={field.onChange}
            disabled={disabled}
            aria-describedby={description ? `${id}-desc` : undefined}
            className="mt-px"
          />
          <span>
            <label htmlFor={id} className="cursor-pointer font-medium">
              {label}
            </label>
            {description && (
              <span id={`${id}-desc`} className="block text-muted-foreground">
                {description}
              </span>
            )}
          </span>
        </div>
      )}
    />
  );
}

/** A form section: title and description on the left, a two-column field grid on the right. */
export function FormGroup({ title, description, children, columns = 2, className }) {
  const id = useId();
  return (
    <div
      role="group"
      aria-labelledby={id}
      className={cn('grid gap-x-8 gap-y-4 px-4 py-5 sm:px-6 lg:grid-cols-[11rem_minmax(0,1fr)]', className)}
    >
      <div>
        <h2 id={id} className="type-h3">
          {title}
        </h2>
        {description && <p className="mt-0.5 type-caption text-muted-foreground">{description}</p>}
      </div>
      <div className={cn('grid content-start gap-4', columns === 2 && 'sm:grid-cols-2')}>{children}</div>
    </div>
  );
}

/** The ruled footer under a form: a note on the left, actions on the right. */
export function FormFooter({ note, children }) {
  return (
    <footer className="flex flex-col-reverse gap-3 border-t bg-sunken/60 px-4 py-3 sm:flex-row sm:items-center sm:px-6">
      {note ? <p className="type-caption text-muted-foreground sm:mr-auto">{note}</p> : <span className="sm:mr-auto" />}
      <div className="flex flex-col-reverse gap-2 sm:flex-row">{children}</div>
    </footer>
  );
}
