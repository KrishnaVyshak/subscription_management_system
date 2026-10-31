import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InvoiceStatusBadge, StatusBadge } from '@/components/ui/status-badge';
import { useApiMutation, useList, useRecord } from '@/api/factory';
import { DateCell, DetailList, MoneyCell, RefCell } from '@/components/app/cells';
import { DataTable } from '@/components/app/data-table';
import { KpiCard, MetricStrip } from '@/components/app/kpi-card';
import { Page, PageHeader } from '@/components/app/page-header';
import { ResourcePage } from '@/components/app/resource-page';
import { EmptyState, QueryState } from '@/components/app/states';
import { api } from '@/lib/api';
import { nullIfEmpty } from '@/lib/forms';

export function CustomersPage() {
  const navigate = useNavigate();
  const invite = useApiMutation({
    mutationFn: (id) => api.post(`/customers/${id}/invite`),
    invalidate: [['customers']],
    success: 'Portal invitation sent',
  });
  return (
    <ResourcePage
      title="Customers" description="Everyone you bill." url="/customers" qk="customers" entity="Customer" createLabel="New customer"
      canWrite defaultSort="name" includeInactive
      onRowClick={(r) => navigate(`/app/customers/${r.id}`)}
      blank={{ name: '', email: '', phone: '', billingAddress: '', gstin: '' }}
      columns={[
        { id: 'name', header: 'Customer', sortKey: 'name', primary: true, cell: (r) => <RefCell primary={r.name} secondary={r.email} /> },
        { id: 'subs', header: 'Active subs', numeric: true, cell: (r) => r.activeSubscriptions ?? 0 },
        { id: 'portal', header: 'Portal', cell: (r) => <Badge tone={r.hasPortal ? 'success' : 'neutral'}>{r.hasPortal ? 'Has login' : 'No login'}</Badge> },
        { id: 'st', header: 'Status', cell: (r) => <StatusBadge status={r.isActive === false ? 'inactive' : 'active'} /> },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Phone' },
        { name: 'gstin', label: 'GSTIN', hint: '15 characters' },
        { name: 'billingAddress', label: 'Billing address', type: 'textarea' },
        { name: 'isActive', label: 'Active', type: 'switch', editOnly: true },
      ]}
      toInitial={(r) => ({ name: r.name, email: r.email, phone: r.phone ?? '', gstin: r.gstin ?? '', billingAddress: r.billingAddress ?? '', isActive: r.isActive !== false })}
      toPayload={(v, editing) => ({
        name: v.name,
        email: v.email,
        phone: nullIfEmpty(v.phone) ?? undefined,
        gstin: nullIfEmpty(v.gstin) ?? undefined,
        billingAddress: nullIfEmpty(v.billingAddress) ?? undefined,
        ...(editing ? { isActive: Boolean(v.isActive) } : {}),
      })}
      rowActions={(r) =>
        !r.hasPortal && (
          <Button size="sm" variant="tertiary" loading={invite.isPending} onClick={() => invite.mutate(r.id)}>
            Invite
          </Button>
        )
      }
    />
  );
}

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const q = useRecord('customer', '/customers', id);
  const subs = useList('subscriptions', '/subscriptions', { customerId: id, pageSize: 10 });
  const invs = useList('invoices', '/invoices', { customerId: id, pageSize: 10, sort: '-invoiceDate' });
  return (
    <QueryState query={q} notFound={<EmptyState title="Customer not found" />}>
      {(c) => (
        <Page>
          <PageHeader title={c.name} crumbs={[{ label: 'Customers', to: '/app/customers' }, { label: c.name }]} description={c.email} />
          <MetricStrip className="sm:grid-cols-4">
            <KpiCard label="Active subscriptions" value={c.activeSubscriptions} />
            <KpiCard label="Outstanding" value={<MoneyCell value={c.outstandingAmount} />} hint={`${c.outstandingInvoices} invoices`} />
            <KpiCard label="Overdue" tone="danger" value={<MoneyCell value={c.overdueAmount} />} hint={`${c.overdueInvoices} invoices`} />
            <KpiCard label="Total subscriptions" value={c.totalSubscriptions} />
          </MetricStrip>
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent>
              <DetailList items={[{ label: 'Phone', value: c.phone }, { label: 'GSTIN', value: c.gstin }, { label: 'Billing address', value: c.billingAddress }, { label: 'Portal login', value: c.hasPortal ? 'Yes' : 'No' }]} />
            </CardContent>
          </Card>
          <h2 className="type-h2">Subscriptions</h2>
          <DataTable
            label="Subscriptions" query={subs} onRowClick={(r) => navigate(`/app/subscriptions/${r.id}`)}
            empty={<EmptyState title="No subscriptions" />}
            columns={[
              { id: 'n', header: 'Number', primary: true, cell: (r) => <RefCell primary={r.number} secondary={r.planName} /> },
              { id: 's', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
              { id: 'm', header: 'Recurring', numeric: true, cell: (r) => <MoneyCell value={r.recurringAmount} /> },
              { id: 'd', header: 'Next invoice', cell: (r) => <DateCell value={r.nextInvoiceDate} /> },
            ]}
          />
          <h2 className="type-h2">Invoices</h2>
          <DataTable
            label="Invoices" query={invs} onRowClick={(r) => navigate(`/app/invoices/${r.id}`)}
            empty={<EmptyState title="No invoices" />}
            columns={[
              { id: 'n', header: 'Number', primary: true, cell: (r) => <RefCell primary={r.number} /> },
              { id: 's', header: 'Status', cell: (r) => <InvoiceStatusBadge invoice={r} /> },
              { id: 'd', header: 'Due', cell: (r) => <DateCell value={r.dueDate} /> },
              { id: 't', header: 'Total', numeric: true, cell: (r) => <MoneyCell value={r.total} /> },
              { id: 'a', header: 'Due amount', numeric: true, cell: (r) => <MoneyCell value={r.amountDue} /> },
            ]}
          />
        </Page>
      )}
    </QueryState>
  );
}
