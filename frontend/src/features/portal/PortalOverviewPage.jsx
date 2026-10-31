import { Repeat } from 'lucide-react';
import { useAuth } from '@/auth/context';
import { Page, PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/states';

// Placeholder until the customer portal lands (phase 8).
export default function PortalOverviewPage() {
  const { user } = useAuth();
  return (
    <Page>
      <PageHeader title={`Hello, ${user?.fullName ?? ''}`} />
      <EmptyState icon={Repeat} title="Your account overview is on its way" />
    </Page>
  );
}
