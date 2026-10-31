import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Download, FileText, Play } from 'lucide-react';
import { useApiMutation, useList, useRecord, FINANCE_KEYS } from '@/api/factory';
import { useAuth } from '@/auth/context';
import { DateCell, DetailList, MoneyCell, RefCell } from '@/components/app/cells';
import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { DataTable, SimpleTable } from '@/components/app/data-table';
import { DateRangeFilter, FilterBar, FilterSpacer, SearchInput, SelectFilter, StatusTabs } from '@/components/app/filter-bar';
import { KpiCard, MetricStrip } from '@/components/app/kpi-card';
import { Page, PageHeader } from '@/components/app/page-header';
import { EmptyState, QueryState } from '@/components/app/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { InvoiceStatusBadge, StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { useListParams } from '@/hooks/use-list-params';
import { api, downloadBlob, openBlob } from '@/lib/api';
import { todayIST } from '@/lib/dates';
import { notifyError } from '@/lib/errors';
import { formatDate, formatMoney, METHOD_LABELS } from '@/lib/format';

const INV_STATUSES = ['draft', 'confirmed', 'paid', 'cancelled'];
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const methodOpts = Object.entries(METHOD_LABELS).map(([value, label]) => ({ value, label }));

export function InvoicesPage() {
  const navigate = useNavigate();
  const { params, set, page, pageSize, sort } = useListParams({ sort: '-invoiceDate' });
  const [selected, setSelected] = useState(new Set());
  const filters = { page, pageSize, sort, status: params.status, overdue: params.overdue, from: params.from, to: params.to, search: params.search };
  const query = useList('invoices', '/invoices', filters);
  const counts = query.data?.meta?.statusCounts ?? {};
  const totals = query.data?.meta?.totals;
  const bulk = useApiMutation({
    mutationFn: (ids) => api.post('/invoices/send-bulk', { invoiceIds: ids }),
    invalidate: [['invoices']],
    success: (r) => `Sent ${r.data?.sent ?? 0}, failed ${r.data?.failed ?? 0}`,
    onSuccess: () => setSelected(new Set()),
  });
  return (
    <Page>
      <PageHeader
        title="Invoices" description="Raised from subscriptions."
        actions={<Button variant="secondary" onClick={() => downloadBlob('/invoices', { ...filters, format: 'csv', page: undefined, pageSize: undefined }, 'invoices.csv').catch(notifyError)}><Download /> Export CSV</Button>}
      />
      {totals && (
        <MetricStrip className="sm:grid-cols-3">
          <KpiCard label="Invoiced" value={formatMoney(totals.total)} />
          <KpiCard label="Paid" value={formatMoney(totals.amountPaid)} />
          <KpiCard label="Due" value={formatMoney(totals.amountDue)} />
        </MetricStrip>
      )}
      <DataTable
        label="Invoices" query={query} sort={sort} page={page} pageSize={pageSize}
        onSortChange={(s) => set({ sort: s }, { resetPage: false })}
        onPageChange={(p) => set({ page: p }, { resetPage: false })}
        onRowClick={(r) => navigate(`/app/invoices/${r.id}`)}
        selected={selected} onSelectedChange={setSelected}
        bulkActions={(ids) => <Button size="sm" loading={bulk.isPending} onClick={() => bulk.mutate(ids)}>Send selected</Button>}
        toolbar={
          <FilterBar>
            <SearchInput value={params.search ?? ''} onChange={(v) => set({ search: v })} placeholder="Number, customer…" />
            <DateRangeFilter label="Date" from={params.from} to={params.to} onChange={(r) => set(r)} />
            <FilterSpacer />
            <SelectFilter label="Overdue" value={params.overdue ?? ''} onChange={(v) => set({ overdue: v })} options={[{ value: 'true', label: 'Overdue only' }]} />
            <StatusTabs
              value={params.status ?? ''} onChange={(v) => set({ status: v })}
              options={[{ value: '', label: 'All' }, ...INV_STATUSES.map((s) => ({ value: s, label: cap(s), count: counts[s] }))]}
            />
          </FilterBar>
        }
        empty={<EmptyState title="No invoices found" />}
        columns={[
          { id: 'n', header: 'Number', sortKey: 'number', primary: true, cell: (r) => <RefCell primary={r.number} secondary={r.subscriptionNumber} /> },
          { id: 'c', header: 'Customer', sortKey: 'customerName', cell: (r) => r.customerName },
          { id: 's', header: 'Status', sortKey: 'status', cell: (r) => <InvoiceStatusBadge invoice={r} /> },
          { id: 'd', header: 'Due', sortKey: 'dueDate', cell: (r) => <DateCell value={r.dueDate} /> },
          { id: 't', header: 'Total', sortKey: 'total', sortDesc: true, numeric: true, cell: (r) => <MoneyCell value={r.total} /> },
          { id: 'a', header: 'Amount due', sortKey: 'amountDue', sortDesc: true, numeric: true, cell: (r) => <MoneyCell value={r.amountDue} /> },
        ]}
      />
    </Page>
  );
}

function PaymentDialog({ invoice, open, onClose }) {
  const [v, setV] = useState({ method: 'bank_transfer', amount: invoice.amountDue, paymentDate: todayIST(), note: '' });
  const pay = useApiMutation({
    mutationFn: (body) => api.post(`/invoices/${invoice.id}/payments`, body),
    invalidate: [['invoice', invoice.id], ...FINANCE_KEYS],
    success: 'Payment recorded',
    onSuccess: onClose,
  });
  return (
    <ConfirmDialog
      open={open} onClose={onClose} title="Record payment" confirmLabel="Record" loading={pay.isPending}
      description={`${formatMoney(invoice.amountDue)} is due on ${invoice.number}.`}
      onConfirm={() => pay.mutate({ method: v.method, amount: String(v.amount), paymentDate: v.paymentDate, note: v.note || undefined })}
    >
      <div className="grid gap-3">
        <Field label="Method"><Select value={v.method} onChange={(e) => setV({ ...v, method: e.target.value })}>{methodOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>
        <Field label="Amount (₹)"><Input type="number" step="0.01" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></Field>
        <Field label="Date"><Input type="date" max={todayIST()} value={v.paymentDate} onChange={(e) => setV({ ...v, paymentDate: e.target.value })} /></Field>
        <Field label="Note"><Textarea value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></Field>
      </div>
    </ConfirmDialog>
  );
}

export function InvoiceDetailPage() {
  const { id } = useParams();
  const { role } = useAuth();
  const q = useRecord('invoice', '/invoices', id);
  const [paying, setPaying] = useState(false);
  const [cancel, setCancel] = useState(false);
  const keys = [['invoice', id], ...FINANCE_KEYS];
  const act = useApiMutation({ mutationFn: ({ path }) => api.post(`/invoices/${id}/${path}`), invalidate: keys, success: (_, v) => v.msg, onSuccess: () => setCancel(false) });
  const delPay = useApiMutation({ mutationFn: (pid) => api.delete(`/payments/${pid}`), invalidate: keys, success: 'Payment removed' });
  return (
    <QueryState query={q} notFound={<EmptyState title="Invoice not found" />}>
      {(i) => (
        <Page>
          <PageHeader
            title={<>{i.number} <InvoiceStatusBadge invoice={i} /></>}
            crumbs={[{ label: 'Invoices', to: '/app/invoices' }, { label: i.number }]}
            description={i.customer?.name ?? i.customerName}
            actions={
              <>
                <Button variant="secondary" onClick={() => openBlob(`/invoices/${id}/pdf`).catch(notifyError)}><FileText /> PDF</Button>
                {i.status === 'draft' && <Button variant="secondary" onClick={() => act.mutate({ path: 'confirm', msg: 'Invoice confirmed' })}>Confirm</Button>}
                {['draft', 'confirmed'].includes(i.status) && <Button variant="secondary" onClick={() => act.mutate({ path: 'send', msg: 'Invoice sent' })}>Send</Button>}
                {i.isOverdue && <Button variant="secondary" onClick={() => act.mutate({ path: 'remind', msg: 'Reminder sent' })}>Remind</Button>}
                {i.status === 'confirmed' && <Button onClick={() => setPaying(true)}>Record payment</Button>}
                {['draft', 'confirmed'].includes(i.status) && Number(i.amountPaid) === 0 && <Button variant="danger-quiet" onClick={() => setCancel(true)}>Cancel</Button>}
              </>
            }
          />
          <MetricStrip className="sm:grid-cols-3">
            <KpiCard label="Total" value={formatMoney(i.total)} />
            <KpiCard label="Paid" value={formatMoney(i.amountPaid)} />
            <KpiCard label="Due" value={formatMoney(i.amountDue)} tone={i.isOverdue ? 'danger' : undefined} hint={i.isOverdue ? `${i.daysOverdue} days overdue` : undefined} />
          </MetricStrip>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>Lines</CardTitle></CardHeader>
              <CardContent>
                <SimpleTable
                  label="Invoice lines" rows={i.lines}
                  columns={[
                    { id: 'p', header: 'Item', cell: (l) => l.description ?? l.productName },
                    { id: 'q', header: 'Qty', numeric: true, cell: (l) => l.quantity },
                    { id: 'u', header: 'Unit', numeric: true, cell: (l) => <MoneyCell value={l.unitPrice} /> },
                    { id: 'a', header: 'Amount', numeric: true, cell: (l) => <MoneyCell value={l.amount ?? l.lineTotal} /> },
                  ]}
                />
                <DetailList className="mt-3" items={[
                  { label: 'Subtotal', value: <MoneyCell value={i.subtotal} /> },
                  { label: 'Discount', value: <MoneyCell value={i.discountTotal} /> },
                  { label: 'Tax', value: <MoneyCell value={i.taxTotal} /> },
                  { label: 'Total', value: <MoneyCell value={i.total} className="font-semibold" /> },
                ]} />
              </CardContent>
            </Card>
            <div className="space-y-5">
              <Card>
                <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                <CardContent>
                  <DetailList items={[
                    { label: 'Invoice date', value: <DateCell value={i.invoiceDate} /> },
                    { label: 'Due date', value: <DateCell value={i.dueDate} /> },
                    { label: 'Subscription', value: i.subscriptionId ? <Link className="text-link" to={`/app/subscriptions/${i.subscriptionId}`}>{i.subscriptionNumber ?? 'Open'}</Link> : null },
                    { label: 'Sent', value: i.sentAt ? formatDate(i.sentAt) : null },
                  ]} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Payments</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(i.payments ?? []).map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-[0.8125rem]">
                      <span><MoneyCell value={p.amount} /> · {METHOD_LABELS[p.method]} · <DateCell value={p.paymentDate} /></span>
                      {role === 'admin' && <Button size="sm" variant="danger-quiet" onClick={() => delPay.mutate(p.id)}>Delete</Button>}
                    </div>
                  ))}
                  {!i.payments?.length && <p className="type-caption text-muted-foreground">No payments yet.</p>}
                </CardContent>
              </Card>
            </div>
          </div>
          {paying && <PaymentDialog invoice={i} open onClose={() => setPaying(false)} />}
          <ConfirmDialog open={cancel} onClose={() => setCancel(false)} tone="danger" title="Cancel this invoice?" confirmLabel="Cancel invoice" loading={act.isPending}
            description="Discount usages are released. The subscription is not rewound." onConfirm={() => act.mutate({ path: 'cancel', msg: 'Invoice cancelled' })} />
        </Page>
      )}
    </QueryState>
  );
}

export function PaymentsPage() {
  const { role } = useAuth();
  const { params, set, page, pageSize, sort } = useListParams({ sort: '-paymentDate' });
  const query = useList('payments', '/payments', { page, pageSize, sort, method: params.method, from: params.from, to: params.to, search: params.search });
  const del = useApiMutation({ mutationFn: (pid) => api.delete(`/payments/${pid}`), invalidate: FINANCE_KEYS, success: 'Payment removed' });
  return (
    <Page>
      <PageHeader title="Payments" description="Everything collected." meta={query.data?.meta?.totalAmount && `Total ${formatMoney(query.data.meta.totalAmount)}`} />
      <DataTable
        label="Payments" query={query} sort={sort} page={page} pageSize={pageSize}
        onSortChange={(s) => set({ sort: s }, { resetPage: false })}
        onPageChange={(p) => set({ page: p }, { resetPage: false })}
        toolbar={
          <FilterBar>
            <SearchInput value={params.search ?? ''} onChange={(v) => set({ search: v })} />
            <DateRangeFilter label="Date" from={params.from} to={params.to} onChange={(r) => set(r)} />
            <FilterSpacer />
            <SelectFilter label="Method" value={params.method ?? ''} onChange={(v) => set({ method: v })} options={methodOpts} />
          </FilterBar>
        }
        empty={<EmptyState title="No payments found" />}
        columns={[
          { id: 'd', header: 'Date', sortKey: 'paymentDate', primary: true, cell: (r) => <DateCell value={r.paymentDate} /> },
          { id: 'i', header: 'Invoice', cell: (r) => <Link className="font-mono text-link" to={`/app/invoices/${r.invoiceId}`}>{r.invoiceNumber ?? 'Open'}</Link> },
          { id: 'c', header: 'Customer', sortKey: 'customerName', cell: (r) => r.customerName },
          { id: 'm', header: 'Method', cell: (r) => METHOD_LABELS[r.method] },
          { id: 'a', header: 'Amount', sortKey: 'amount', sortDesc: true, numeric: true, cell: (r) => <MoneyCell value={r.amount} /> },
          ...(role === 'admin' ? [{ id: 'x', header: '', mobile: false, cell: (r) => <Button size="sm" variant="danger-quiet" onClick={() => del.mutate(r.id)}>Delete</Button> }] : []),
        ]}
      />
    </Page>
  );
}

export function ReceivablesPage() {
  const navigate = useNavigate();
  const { params, set, sort } = useListParams({ sort: '-daysOverdue' });
  const summary = useRecord('receivables', '/receivables/summary', 'x', { queryFn: () => api.get('/receivables/summary').then((r) => r.data), enabled: true });
  const query = useList('receivables', '/receivables/overdue', { sort, search: params.search, pageSize: 50 });
  const remind = useApiMutation({ mutationFn: (id) => api.post(`/invoices/${id}/remind`), invalidate: [['receivables']], success: 'Reminder sent' });
  const a = summary.data?.ageing;
  return (
    <Page>
      <PageHeader title="Receivables" description="What is owed and how late it is." />
      <MetricStrip className="sm:grid-cols-4">
        <KpiCard label="Outstanding" featured loading={!summary.data} value={formatMoney(summary.data?.outstanding)} hint={`${summary.data?.outstandingCount ?? 0} invoices`} />
        <KpiCard label="Overdue" tone="danger" loading={!summary.data} value={formatMoney(summary.data?.overdueAmount)} hint={`${summary.data?.overdueCount ?? 0} invoices`} />
        <KpiCard label="Collected this month" loading={!summary.data} value={formatMoney(summary.data?.collectedThisMonth)} />
        <KpiCard label="Not yet due" loading={!summary.data} value={formatMoney(a?.notDue?.amount)} hint={`${a?.notDue?.count ?? 0} invoices`} />
      </MetricStrip>
      {a && (
        <Card>
          <CardHeader><CardTitle>Ageing</CardTitle></CardHeader>
          <CardContent>
            <SimpleTable label="Ageing" rows={[{ id: 1 }]} columns={[
              { id: 'a', header: '1–30 days', numeric: true, cell: () => formatMoney(a.days130.amount) },
              { id: 'b', header: '31–60 days', numeric: true, cell: () => formatMoney(a.days3160.amount) },
              { id: 'c', header: '61–90 days', numeric: true, cell: () => formatMoney(a.days6190.amount) },
              { id: 'd', header: '90+ days', numeric: true, cell: () => formatMoney(a.days90Plus.amount) },
            ]} />
          </CardContent>
        </Card>
      )}
      <DataTable
        label="Overdue invoices" query={query} sort={sort} onSortChange={(s) => set({ sort: s })}
        onRowClick={(r) => navigate(`/app/invoices/${r.id}`)}
        toolbar={<FilterBar><SearchInput value={params.search ?? ''} onChange={(v) => set({ search: v })} /></FilterBar>}
        empty={<EmptyState title="Nothing overdue" />}
        columns={[
          { id: 'n', header: 'Invoice', primary: true, cell: (r) => <RefCell primary={r.number} secondary={r.customerName} /> },
          { id: 'o', header: 'Days overdue', sortKey: 'daysOverdue', sortDesc: true, numeric: true, cell: (r) => r.daysOverdue },
          { id: 'd', header: 'Due', sortKey: 'dueDate', cell: (r) => <DateCell value={r.dueDate} /> },
          { id: 'a', header: 'Amount due', sortKey: 'amountDue', sortDesc: true, numeric: true, cell: (r) => <MoneyCell value={r.amountDue} /> },
          { id: 'r', header: '', mobile: false, cell: (r) => <Button size="sm" variant="secondary" onClick={() => remind.mutate(r.id)}>Remind</Button> },
        ]}
      />
    </Page>
  );
}

export function BillingRunsPage() {
  const { role } = useAuth();
  const [asOf, setAsOf] = useState('');
  const query = useList('billing-runs', '/billing/runs', { pageSize: 25 });
  const run = useApiMutation({
    mutationFn: () => api.post('/billing/run', asOf ? { asOfDate: asOf } : {}),
    invalidate: [['billing-runs'], ...FINANCE_KEYS, ['subscriptions']],
    success: (r) => `Generated ${r.data?.generated ?? 0} invoices`,
  });
  return (
    <Page>
      <PageHeader
        title="Billing runs" description="Invoices generated for subscriptions that are due."
        actions={role === 'admin' && (
          <>
            <Input type="date" aria-label="As of date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="w-40" />
            <Button loading={run.isPending} onClick={() => run.mutate()}><Play /> Run billing</Button>
          </>
        )}
      />
      <DataTable
        label="Billing runs" query={query}
        empty={<EmptyState title="No billing runs yet" />}
        columns={[
          { id: 'd', header: 'As of', primary: true, cell: (r) => <DateCell value={r.asOfDate} /> },
          { id: 's', header: 'Status', cell: (r) => <StatusBadge status={r.status} /> },
          { id: 'due', header: 'Due', numeric: true, cell: (r) => r.due },
          { id: 'g', header: 'Generated', numeric: true, cell: (r) => r.generated },
          { id: 'sk', header: 'Skipped', numeric: true, cell: (r) => r.skipped },
          { id: 'f', header: 'Failed', numeric: true, cell: (r) => r.failed },
          { id: 'c', header: 'Started', cell: (r) => <DateCell withTime value={r.startedAt ?? r.createdAt} /> },
        ]}
      />
    </Page>
  );
}
