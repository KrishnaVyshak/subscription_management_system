import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/auth/context';
import { NewPasswordForm } from '@/components/app/new-password-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { api } from '@/lib/api';
import { AuthCard } from '@/layouts/AuthLayout';

export default function ResetPasswordPage() {
  const { session, loading, signOut } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="grid h-60 place-items-center text-muted-foreground">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (!session) {
    return (
      <AuthCard title="Reset link expired">
        <Alert
          tone="warning"
          title="This link is invalid or has expired"
          action={
            <Button as={Link} to="/forgot-password" size="sm" variant="secondary">
              Send a new link
            </Button>
          }
        >
          Reset links work once and expire after a while.
        </Alert>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" description={`For ${session.user.email}`}>
      <NewPasswordForm
        submitLabel="Save new password"
        onSubmit={async (password) => {
          await api.post('/auth/change-password', { password });
          await signOut();
          toast.success('Password changed', { description: 'Sign in with your new password.' });
          navigate('/login', { replace: true });
        }}
      />
    </AuthCard>
  );
}
