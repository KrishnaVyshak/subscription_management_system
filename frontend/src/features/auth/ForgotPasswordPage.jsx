import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TextField } from '@/components/app/form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { AuthCard } from '@/layouts/AuthLayout';

const schema = z.object({ email: z.email('Enter a valid email address') });

const appUrl = () => import.meta.env.VITE_APP_URL || window.location.origin;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { email: '' } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    // The answer is the same whether or not the address has an account (no account probing).
    await supabase.auth
      .resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${appUrl()}/reset-password` })
      .catch(() => {});
    setSent(true);
  });

  return (
    <AuthCard
      title="Reset your password"
      description="We'll email you a link to choose a new one."
      footer={
        <Link to="/login" className="text-link underline decoration-link/35 underline-offset-[3px] hover:decoration-link">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Alert tone="success" title="Check your inbox">
          If an account exists for that address, a reset link is on its way. It can take a few minutes.
        </Alert>
      ) : (
        <form noValidate onSubmit={onSubmit} className="space-y-4">
          <TextField form={form} name="email" label="Email" type="email" autoComplete="email" required />
          <div className="flex justify-end">
            <Button type="submit" loading={form.formState.isSubmitting}>
              Send reset link
            </Button>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
