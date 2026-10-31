import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PASSWORD_REGEX } from '@brightloop/shared';
import { useAuth } from '@/auth/context';
import { TextField } from '@/components/app/form';
import { PasswordChecklist } from '@/components/app/password-checklist';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { applyFieldErrors, errorMessage } from '@/lib/errors';
import { AuthCard } from '@/layouts/AuthLayout';

// Same rule as the backend (shared PASSWORD_REGEX).
const schema = z.object({
  fullName: z.string().trim().min(1, 'Enter your name').max(200),
  email: z.email('Enter a valid email address'),
  phone: z.string().trim().max(30, 'At most 30 characters').optional(),
  password: z.string().regex(PASSWORD_REGEX, 'The password must meet every rule below'),
});

export default function SignupPage() {
  const { signIn } = useAuth();
  const [error, setError] = useState(null);
  const form = useForm({
    resolver: zodResolver(schema),
    // Show errors immediately as the user types after first submission attempt
    mode: 'onTouched',
    defaultValues: { fullName: '', email: '', phone: '', password: '' },
  });
  const password = useWatch({ control: form.control, name: 'password' });
  const { isSubmitting, submitCount, errors } = form.formState;
  const hasErrors = Object.keys(errors).length > 0;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const email = values.email.trim().toLowerCase();
    try {
      await api.post('/auth/signup', { ...values, email, phone: values.phone || undefined });
    } catch (err) {
      if (err.status === 409) {
        form.setError('email', { type: 'server', message: 'An account with this email already exists' });
      } else if (!applyFieldErrors(err, form.setError, Object.keys(schema.shape))) {
        setError(errorMessage(err));
      }
      return;
    }
    try {
      await signIn(email, values.password); // PublicOnlyRoute then sends them to the portal
    } catch {
      setError('Your account was created, but signing in failed. Try signing in.');
    }
  });

  return (
    <AuthCard
      eyebrow="Customer portal"
      title="Create your account"
      description="See your subscriptions, invoices and payments in one place."
      footer={
        <p className="text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="text-link underline decoration-link/35 underline-offset-[3px] hover:decoration-link">
            Sign in
          </Link>
        </p>
      }
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {error && <Alert tone="danger" title="Couldn't create the account">{error}</Alert>}

        {/* Show a summary when the form has been submitted with errors */}
        {submitCount > 0 && hasErrors && !error && (
          <Alert tone="danger" title="Please fix the errors below" />
        )}

        <TextField form={form} name="fullName" label="Full name" autoComplete="name" required />
        <TextField form={form} name="email" label="Email" type="email" autoComplete="email" required />
        <TextField form={form} name="phone" label="Phone" type="tel" autoComplete="tel" hint="Optional" />
        <div className="space-y-2">
          <TextField
            form={form}
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            required
          />
          <PasswordChecklist id="password-rules" value={password} />
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={isSubmitting}
            // Pulse red border briefly when submitted with errors
            className={submitCount > 0 && hasErrors && !isSubmitting ? 'animate-[shake_0.3s_ease-in-out]' : ''}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}
