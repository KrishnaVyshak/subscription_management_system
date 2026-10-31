import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/auth/context';
import { TextField } from '@/components/app/form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorMessage } from '@/lib/errors';
import { AuthCard } from '@/layouts/AuthLayout';

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

function signInMessage(err) {
  if (err?.status === 403) return 'This account is deactivated. Ask an administrator to reactivate it.';
  if (err?.status === 401) return "This login isn't linked to a Brightloop account yet.";
  // Supabase auth errors carry their own message ("Invalid login credentials").
  if (err?.name?.startsWith?.('Auth') || err?.__isAuthError) {
    return /invalid login/i.test(err.message) ? 'The email or password is incorrect.' : err.message;
  }
  return errorMessage(err);
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const [error, setError] = useState(null);
  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });
  const { isSubmitting, submitCount, errors } = form.formState;
  const hasErrors = Object.keys(errors).length > 0;

  // On success the PublicOnlyRoute around this page sends the user home (or to `next`).
  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (err) {
      setError(signInMessage(err));
    }
  });

  return (
    <AuthCard
      eyebrow="Brightloop Subscriptions"
      title="Sign in"
      description="Staff and customers sign in here."
      footer={
        <p className="text-muted-foreground">
          New customer?{' '}
          <Link to="/signup" className="text-link underline decoration-link/35 underline-offset-[3px] hover:decoration-link">
            Create an account
          </Link>
        </p>
      }
    >
      <form noValidate onSubmit={onSubmit} className="space-y-4">
        {error && (
          <Alert tone="danger" title="Couldn't sign you in">
            {error}
          </Alert>
        )}
        <TextField form={form} name="email" label="Email" type="email" autoComplete="email" required />
        <TextField form={form} name="password" label="Password" type="password" autoComplete="current-password" required />
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/forgot-password"
            className="rounded-sm text-[0.8125rem] text-link underline decoration-link/35 underline-offset-[3px] outline-none hover:decoration-link focus-visible:outline-2 focus-visible:outline-ring"
          >
            Forgot password?
          </Link>
          <Button
            type="submit"
            loading={isSubmitting}
            className={submitCount > 0 && hasErrors && !isSubmitting ? 'animate-[shake_0.3s_ease-in-out]' : ''}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
      </form>
    </AuthCard>
  );
}
