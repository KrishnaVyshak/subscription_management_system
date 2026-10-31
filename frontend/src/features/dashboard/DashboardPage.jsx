import { LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/auth/context';
import { Page, PageHeader } from '@/components/app/page-header';
import { EmptyState } from '@/components/app/states';

// Placeholder until the finance dashboard lands (phase 7).
export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <Page>
      <PageHeader title="Dashboard" description={`Signed in as ${user?.fullName ?? user?.email}`} />
      <EmptyState icon={LayoutDashboard} title="The finance dashboard is on its way" />
    </Page>
  );
}
