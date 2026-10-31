import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useApiMutation, useList, useRecord } from '@/api/factory';
import { useAuth } from '@/auth/context';
import { DateCell, DetailList, MoneyCell, RefCell } from '@/components/app/cells';
import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { DataTable, SimpleTable } from '@/components/app/data-table';
import { FilterBar, StatusTabs } from '@/components/app/filter-bar';
import { KpiCard, MetricStrip } from '@/components/app/kpi-card';
import { Page, PageHeader } from '@/components/app/page-header';
import { EmptyState, QueryState } from '@/components/app/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InvoiceStatusBadge, StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { useListParams } from '@/hooks/use-list-params';
import { api, openBlob } from '@/lib/api';
import { notifyError } from '@/lib/errors';
import { formatMoney, METHOD_LABELS, perPeriod } from '@/lib/format';
import { ProductPicker } from '@/components/app/pickers';

export function PortalOverviewPage() {
  const { user } = useAuth();
  const q = useQuery({ queryKey: ['portal', 'overview'], queryFn: () => api.get('/portal/overview').then((r) => r.data) });
  return (
    <Page>
      <PageHeader title={`Hello, ${user?.fullName ?? ''}`} description="Your account at a glance." />
      <QueryState query={q}>
        {(o) => (
          <>
            <MetricStrip className="sm:grid-cols-4">
              <KpiCard label="Active subscriptions" value={o.activeSubscriptions ?? 0} to="/portal/subscriptions" />
              <KpiCard label="Next invoice" value={o.nextInvoiceDate ?? '—'} />
              <KpiCard label="Outstanding" value={formatMoney(o.outstandingAmount)} to="/portal/invoices" />
              <KpiCard label="Overdue" tone="danger" value={formatMoney(o.overdueAmount)} />
            </MetricStrip>
            <Card>
              <CardHeader><CardTitle>Recent invoices</CardTitle></CardHeader>
              <CardContent>
                <SimpleTable
                  label="Recent invoices" rows={o.recentInvoices} empty={<p className="type-caption text-muted-foreground">No invoices yet.</p>}
                  columns={[
                    { id: 'n', header: 'Number', cell: (i) => <Link className="font-mono text-link" to={`/portal/invoices/${i.id}`}>{i.number}</Link> },
                    { id: 's', header: 'Status', cell: (i) => <InvoiceStatusBadge invoice={i} /> },
                    { id: 'd', header: 'Due', cell: (i) => <DateCell value={i.dueDate} /> },
                    { id: 't', header: 'Total', numeric: true, cell: (i) => <MoneyCell value={i.total} /> },
                  ]}
                />
              </CardContent>
            </Card>
          </>
        )}
      </QueryState>
    </Page>
  );
}

export function PortalSubscriptionsPage() {
  const navigate = useNavigate();
  const { params, set, page, pageSize } = useListParams();
  const query = useList('portal-subscriptions', '/portal/subscriptions', { page, pageSize, status: params.status });
  return (
    <Page>
      <PageHeader title="Subscriptions" />
      <DataTable
        label="Subscriptions" query={query} page={page} pageSize={pageSize} onPageChange={(p) => set({ page: p }, { resetPage: false })}
        onRowClick={(r) => navigate(`/portal/subscriptions/${r.id}`)}
        toolbar={<FilterBar><StatusTabs value={params.status ?? ''} onChange={(v) => set({ status: v })} options={['', 'confirmed', 'active', 'paused', 'closed'].map((s) => ({ value: s, label: s ? s[0].toUpperCase() + s.slice(1) : 'All' }))} /></FilterBar>}
        empty={<EmptyState title="No subscriptions yet" />}
        columns={[
          { id: 'n', header: 'Number', primary: true, cell: (r) => <RefCell primary={r.number} secondary={r.planName} /> },
          { id: 's', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          { id: 'r', header: 'Recurring', numeric: true, cell: (r) => <MoneyCell value={r.recurringAmount} /> },
          { id: 'ni', header: 'Next invoice', cell: (r) => <DateCell value={r.nextInvoiceDate} /> },
        ]}
      />
    </Page>
  );
}

const PORTAL_ACTIONS = { pause: 'Pause', resume: 'Resume', cancel: 'Cancel subscription', renew: 'Renew' };

export function PortalSubscriptionDetailPage() {
  const { id } = useParams();
  const q = useRecord('portal-subscription', '/portal/subscriptions', id);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState('');
  const [addon, setAddon] = useState({ productId: null, quantity: 1 });
  const keys = [['portal-subscription', id], ['portal-subscriptions'], ['portal']];
  const run = useApiMutation({
    mutationFn: ({ path, body }) => api.post(`/portal/subscriptions/${id}/${path}`, body),
    invalidate: keys, success: (_, v) => v.msg, onSuccess: () => { setAction(null); setNote(''); },
  });
  return (
    <QueryState query={q} notFound={<EmptyState title="Subscription not found" />}>
      {(s) => {
        const allowed = s.allowedActions ?? [];
        return (
          <Page>
            <PageHeader
              title={<>{s.number} <StatusBadge status={s.status} /></>}
              crumbs={[{ label: 'Subscriptions', to: '/portal/subscriptions' }, { label: s.number }]}
              description={s.plan?.name}
              actions={['pause', 'resume', 'renew', 'cancel'].filter((a) => allowed.includes(a)).map((a) => (
                <Button key={a} variant={a === 'cancel' ? 'danger-quiet' : 'secondary'} onClick={() => setAction(a)}>{PORTAL_ACTIONS[a]}</Button>
              ))}
            />
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Items</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <SimpleTable label="Lines" rows={s.lines} columns={[
                    { id: 'p', header: 'Item', cell: (l) => l.productName ?? l.description },
                    { id: 'q', header: 'Qty', numeric: true, cell: (l) => l.quantity },
                    { id: 'u', header: 'Unit', numeric: true, cell: (l) => <MoneyCell value={l.unitPrice} /> },
                    { id: 'x', header: '', cell: (l) => allowed.includes('addons') && l.productType === 'addon' && (
                      <Button size="sm" variant="danger-quiet" onClick={() => run.mutate({ path: 'addons', body: { remove: [l.id] }, msg: 'Add-on removed' })}>Remove</Button>
                    ) },
                  ]} />
                  {allowed.includes('addons') && (
                    <div className="flex flex-wrap items-end gap-2">
                      <Field label="Add an add-on" className="min-w-56 flex-1"><ProductPicker type="addon" value={addon.productId} onChange={(pid) => setAddon({ ...addon, productId: pid })} /></Field>
                      <Field label="Qty" className="w-20"><Input type="number" min={1} value={addon.quantity} onChange={(e) => setAddon({ ...addon, quantity: Number(e.target.value) })} /></Field>
                      <Button variant="secondary" disabled={!addon.productId} loading={run.isPending} onClick={() => run.mutate({ path: 'addons', body: { add: [{ productId: addon.productId, quantity: addon.quantity }] }, msg: 'Add-on added' })}>Add</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                <CardContent>
                  <DetailList items={[
                    { label: 'Plan', value: s.plan ? `${formatMoney(s.plan.price)} ${perPeriod(s.plan.billingPeriod, s.plan.intervalCount)}` : null },
                    { label: 'Started', value: <DateCell value={s.startDate} /> },
                    { label: 'Expires', value: <DateCell value={s.expiryDate} /> },
                    { label: 'Next invoice', value: <DateCell value={s.nextInvoiceDate} /> },
                  ]} />
                </CardContent>
              </Card>
            </div>
            <ConfirmDialog
              open={Boolean(action)} onClose={() => setAction(null)} title={action ? PORTAL_ACTIONS[action] : ''}
              tone={action === 'cancel' ? 'danger' : 'primary'} confirmLabel="Confirm" loading={run.isPending}
              onConfirm={() => run.mutate({ path: action, body: { note: note || undefined }, msg: 'Done' })}
            >
              {action !== 'renew' && <Field label="Note (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>}
            </ConfirmDialog>
          </Page>
        );
      }}
    </QueryState>
  );
}

export function PortalInvoicesPage() {
  const navigate = useNavigate();
  const { params, set, page, pageSize } = useListParams();
  const query = useList('portal-invoices', '/portal/invoices', { page, pageSize, status: params.status });
  return (
    <Page>
      <PageHeader title="Invoices" />
      <DataTable
        label="Invoices" query={query} page={page} pageSize={pageSize} onPageChange={(p) => set({ page: p }, { resetPage: false })}
        onRowClick={(r) => navigate(`/portal/invoices/${r.id}`)}
        toolbar={<FilterBar><StatusTabs value={params.status ?? ''} onChange={(v) => set({ status: v })} options={['', 'confirmed', 'paid', 'cancelled'].map((s) => ({ value: s, label: s ? s[0].toUpperCase() + s.slice(1) : 'All' }))} /></FilterBar>}
        empty={<EmptyState title="No invoices yet" />}
        columns={[
          { id: 'n', header: 'Number', primary: true, cell: (r) => <RefCell primary={r.number} /> },
          { id: 's', header: 'Status', cell: (r) => <InvoiceStatusBadge invoice={r} /> },
          { id: 'd', header: 'Due', cell: (r) => <DateCell value={r.dueDate} /> },
          { id: 't', header: 'Total', numeric: true, cell: (r) => <MoneyCell value={r.total} /> },
          { id: 'a', header: 'Due amount', numeric: true, cell: (r) => <MoneyCell value={r.amountDue} /> },
        ]}
      />
    </Page>
  );
}

export function PortalInvoiceDetailPage() {
  const { id } = useParams();
  const q = useRecord('portal-invoice', '/portal/invoices', id);
  return (
    <QueryState query={q} notFound={<EmptyState title="Invoice not found" />}>
      {(i) => (
        <Page>
          <PageHeader
            title={<>{i.number} <InvoiceStatusBadge invoice={i} /></>}
            crumbs={[{ label: 'Invoices', to: '/portal/invoices' }, { label: i.number }]}
            actions={<Button variant="secondary" onClick={() => openBlob(`/portal/invoices/${id}/pdf`).catch(notifyError)}><FileText /> Download PDF</Button>}
          />
          <MetricStrip className="sm:grid-cols-3">
            <KpiCard label="Total" value={formatMoney(i.total)} />
            <KpiCard label="Paid" value={formatMoney(i.amountPaid)} />
            <KpiCard label="Due" value={formatMoney(i.amountDue)} hint={`Due ${i.dueDate}`} />
          </MetricStrip>
          <Card>
            <CardHeader><CardTitle>Lines</CardTitle></CardHeader>
            <CardContent>
              <SimpleTable label="Lines" rows={i.lines} columns={[
                { id: 'p', header: 'Item', cell: (l) => l.description ?? l.productName },
                { id: 'q', header: 'Qty', numeric: true, cell: (l) => l.quantity },
                { id: 'u', header: 'Unit', numeric: true, cell: (l) => <MoneyCell value={l.unitPrice} /> },
                { id: 'a', header: 'Amount', numeric: true, cell: (l) => <MoneyCell value={l.amount ?? l.lineTotal} /> },
              ]} />
              <DetailList className="mt-3" items={[
                { label: 'Subtotal', value: <MoneyCell value={i.subtotal} /> },
                { label: 'Discount', value: <MoneyCell value={i.discountTotal} /> },
                { label: 'Tax', value: <MoneyCell value={i.taxTotal} /> },
                { label: 'Total', value: <MoneyCell value={i.total} className="font-semibold" /> },
              ]} />
            </CardContent>
          </Card>
        </Page>
      )}
    </QueryState>
  );
}

export function PortalPaymentsPage() {
  const { set, page, pageSize } = useListParams();
  const query = useList('portal-payments', '/portal/payments', { page, pageSize });
  return (
    <Page>
      <PageHeader title="Payments" />
      <DataTable
        label="Payments" query={query} page={page} pageSize={pageSize} onPageChange={(p) => set({ page: p }, { resetPage: false })}
        empty={<EmptyState title="No payments yet" />}
        columns={[
          { id: 'd', header: 'Date', primary: true, cell: (r) => <DateCell value={r.paymentDate} /> },
          { id: 'i', header: 'Invoice', cell: (r) => r.invoiceNumber },
          { id: 'm', header: 'Method', cell: (r) => METHOD_LABELS[r.method] },
          { id: 'a', header: 'Amount', numeric: true, cell: (r) => <MoneyCell value={r.amount} /> },
        ]}
      />
    </Page>
  );
}

export function PortalProfilePage() {
  const q = useQuery({ queryKey: ['portal', 'profile'], queryFn: () => api.get('/portal/profile').then((r) => r.data) });
  const [v, setV] = useState({ name: '', phone: '', billingAddress: '', gstin: '' });
  useEffect(() => {
    if (q.data) setV({ name: q.data.name ?? '', phone: q.data.phone ?? '', billingAddress: q.data.billingAddress ?? '', gstin: q.data.gstin ?? '' });
  }, [q.data]);
  const save = useApiMutation({ mutationFn: () => api.patch('/portal/profile', { name: v.name, phone: v.phone || undefined, billingAddress: v.billingAddress || undefined, gstin: v.gstin || undefined }), invalidate: [['portal']], success: 'Profile saved' });
  const f = (k) => ({ value: v[k], onChange: (e) => setV({ ...v, [k]: e.target.value }) });
  return (
    <Page>
      <PageHeader title="Profile" />
      <QueryState query={q}>
        {(p) => (
          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
              <Field label="Name"><Input {...f('name')} /></Field>
              <Field label="Email" hint="Email can't be changed"><Input value={p.email ?? ''} disabled readOnly /></Field>
              <Field label="Phone"><Input {...f('phone')} /></Field>
              <Field label="GSTIN"><Input {...f('gstin')} /></Field>
              <Field label="Billing address" className="sm:col-span-2"><Textarea {...f('billingAddress')} /></Field>
              <div className="sm:col-span-2"><Button loading={save.isPending} onClick={() => save.mutate()}>Save profile</Button></div>
            </CardContent>
          </Card>
        )}
      </QueryState>
    </Page>
  );
}
