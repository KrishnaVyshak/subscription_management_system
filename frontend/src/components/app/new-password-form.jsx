import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PASSWORD_REGEX } from '@brightloop/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { applyFieldErrors, errorMessage } from '@/lib/errors';
import { TextField } from './form';
import { PasswordChecklist } from './password-checklist';

const newPasswordSchema = z
  .object({
    password: z.string().regex(PASSWORD_REGEX, 'The password must meet every rule below'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The passwords don't match", path: ['confirm'] });

/** New password + confirm with the live checklist. Used here and on the portal profile. */
export function NewPasswordForm({ onSubmit, submitLabel = 'Change password' }) {
  const [error, setError] = useState(null);
  const form = useForm({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: '', confirm: '' } });
  const password = useWatch({ control: form.control, name: 'password' });

  const submit = form.handleSubmit(async ({ password: value }) => {
    setError(null);
    try {
      await onSubmit(value);
      form.reset();
    } catch (err) {
      if (!applyFieldErrors(err, form.setError, ['password'])) setError(errorMessage(err));
    }
  });

  return (
    <form noValidate onSubmit={submit} className="space-y-4">
      {error && <Alert tone="danger" title="Couldn't change the password">{error}</Alert>}
      <div className="space-y-2">
        <TextField
          form={form}
          name="password"
          label="New password"
          type="password"
          autoComplete="new-password"
          required
        />
        <PasswordChecklist id="new-password-rules" value={password} />
      </div>
      <TextField form={form} name="confirm" label="Confirm new password" type="password" autoComplete="new-password" required />
      <div className="flex justify-end">
        <Button type="submit" loading={form.formState.isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
