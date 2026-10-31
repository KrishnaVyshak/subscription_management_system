import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useApiMutation, useList, useRecord, FINANCE_KEYS } from '@/api/factory';
import { fetchProduct } from '@/api/products';
import { useAuth } from '@/auth/context';
import { ActivityTimeline } from '@/components/app/activity-timeline';
import { DateCell, DetailList, MoneyCell, RefCell } from '@/components/app/cells';
import { ConfirmDialog } from '@/components/app/confirm-dialog';
import { DataTable, SimpleTable } from '@/components/app/data-table';
import { FilterBar, FilterSpacer, SearchInput, StatusTabs } from '@/components/app/filter-bar';
import { LinesEditor } from '@/components/app/lines-editor';
import { Page, PageHeader } from '@/components/app/page-header';
import { CustomerPicker, DiscountPicker, PlanPicker } from '@/components/app/pickers';
import { EntityCombobox } from '@/components/app/entity-combobox';
import { StatusStepper } from '@/components/app/status-stepper';
import { EmptyState, QueryState } from '@/components/app/states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { InvoiceStatusBadge, StatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { useListParams } from '@/hooks/use-list-params';
import { api } from '@/lib/api';
import { handleFormError, notifyError } from '@/lib/errors';
import { formatMoney, perPeriod } from '@/lib/format';
import { hydrateLines, lineProblems, linesToPayload } from '@/lib/lines';
import { nullIfEmpty } from '@/lib/forms';
import { todayIST } from '@/lib/dates';
import { runningChanges } from '@/lib/lines';

const STATUSES = ['draft', 'quotation', 'confirmed', 'active', 'paused', 'closed'];

export function SubscriptionsPage() {
  const navigate = useNavigate();
  const { params, set, page, pageSize, sort } = useListParams({ sort: '-createdAt' });
  const query = useList('subscriptions', '/subscriptions', { page, pageSize, sort, status: params.status, search: params.search });
  const counts = query.data?.meta?.statusCounts ?? {};
  const total = Object.values(counts).reduce((a, b) => a + Number(b), 0);
  return (
    <Page>
      <PageHeader
        title="Subscriptions"
        description="Quotations and recurring contracts."
        actions={<Button onClick={() => navigate('/app/subscriptions/new')}><Plus /> New subscription</Button>}
      />
      <DataTable
        label="Subscriptions" query={query} sort={sort} page={page} pageSize={pageSize}
        onSortChange={(s) => set({ sort: s }, { resetPage: false })}
        onPageChange={(p) => set({ page: p }, { resetPage: false })}
        onRowClick={(r) => navigate(`/app/subscriptions/${r.id}`)}
        toolbar={
          <FilterBar>
            <SearchInput value={params.search ?? ''} onChange={(v) => set({ search: v })} placeholder="Number, customer…" />
            <FilterSpacer />
            <StatusTabs
              value={params.status ?? ''} onChange={(v) => set({ status: v })}
              options={[{ value: '', label: 'All', count: total }, ...STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1), count: counts[s] ?? 0 }))]}
            />
          </FilterBar>
        }
        empty={<EmptyState title="No subscriptions found" />}
        columns={[
          { id: 'n', header: 'Number', sortKey: 'number', primary: true, cell: (r) => <RefCell primary={r.number} secondary={r.planName} /> },
          { id: 'c', header: 'Customer', sortKey: 'customerName', cell: (r) => r.customerName },
          { id: 's', header: 'Status', sortKey: 'status', cell: (r) => <StatusBadge status={r.status} /> },
          { id: 'r', header: 'Recurring', numeric: true, cell: (r) => <MoneyCell value={r.recurringAmount} /> },
          { id: 'x', header: 'Expires', sortKey: 'expiryDate', cell: (r) => <DateCell value={r.expiryDate} /> },
          { id: 'ni', header: 'Next invoice', sortKey: 'nextInvoiceDate', cell: (r) => <DateCell value={r.nextInvoiceDate} /> },
        ]}
      />
    </Page>
  );
}

function TermSelect({ value, onChange }) {
  const q = useList('payment-terms', '/payment-terms', { pageSize: 100 });
  return (
    <Select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
      <option value="">No payment term</option>
      {(q.data?.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name} ({t.dueDays} days)</option>)}
    </Select>
  );
}

function TemplatePicker({ value, onChange }) {
  return (
    <EntityCombobox
      queryKey={['templates']} value={value} getLabel={(t) => t.name} placeholder="Search templates…"
      fetchOptions={(search) => api.get('/templates', { search, pageSize: 20 }).then((r) => r.data)}
      onChange={(id) => onChange(id)}
    />
  );
}

export function SubscriptionNewPage() {
  const navigate = useNavigate();
  const [v, setV] = useState({ customerId: null, source: 'plan', planId: null, templateId: null, startDate: todayIST(), expiryDate: '', paymentTermId: '', notes: '' });
  const set = (k, x) => setV((s) => ({ ...s, [k]: x }));
  const create = useApiMutation({
    mutationFn: (body) => api.post('/subscriptions', body).then((r) => r.data),
    invalidate: [['subscriptions']],
    success: (s) => `${s.number} created`,
    manualError: true,
  });
  const submit = (e) => {
    e.preventDefault();
    if (!v.customerId) return notifyError({ message: 'Choose a customer' });
    const body = {
      customerId: v.customerId,
      ...(v.source === 'plan' ? { planId: v.planId } : { templateId: v.templateId }),
      startDate: v.startDate || undefined,
      expiryDate: nullIfEmpty(v.expiryDate) ?? undefined,
      paymentTermId: nullIfEmpty(v.paymentTermId) ?? undefined,
      notes: nullIfEmpty(v.notes) ?? undefined,
    };
    create.mutate(body, { onSuccess: (s) => navigate(`/app/subscriptions/${s.id}`), onError: (err) => handleFormError(err) });
  };
  return (
    <Page>
      <PageHeader title="New subscription" crumbs={[{ label: 'Subscriptions', to: '/app/subscriptions' }, { label: 'New' }]} />
      <Card>
        <form onSubmit={submit} className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
          <Field label="Customer" required><CustomerPicker value={v.customerId} onChange={(id) => set('customerId', id)} /></Field>
          <Field label="Start from">
            <Select value={v.source} onChange={(e) => set('source', e.target.value)}>
              <option value="plan">A plan</option>
              <option value="template">A quotation template</option>
            </Select>
          </Field>
          {v.source === 'plan' ? (
            <Field label="Plan" required><PlanPicker available value={v.planId} onChange={(id) => set('planId', id)} /></Field>
          ) : (
            <Field label="Template" required><TemplatePicker value={v.templateId} onChange={(id) => set('templateId', id)} /></Field>
          )}
          <Field label="Payment term"><TermSelect value={v.paymentTermId} onChange={(x) => set('paymentTermId', x)} /></Field>
          <Field label="Start date"><Input type="date" value={v.startDate} onChange={(e) => set('startDate', e.target.value)} /></Field>
          <Field label="Expiry date"><Input type="date" value={v.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} /></Field>
          <Field label="Notes" className="sm:col-span-2"><Textarea value={v.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="tertiary" onClick={() => navigate('/app/subscriptions')}>Cancel</Button>
            <Button type="submit" loading={create.isPending}>Create draft</Button>
          </div>
        </form>
      </Card>
    </Page>
  );
}

const ACTION_LABELS = {
  quotation: 'Send quotation', confirmed: 'Confirm', active: 'Activate', paused: 'Pause', closed: 'Close', draft: 'Back to draft',
};

function LinesCard({ sub }) {
  const editable = ['draft', 'quotation'].includes(sub.status);
  const running = ['active', 'paused'].includes(sub.status);
  const [lines, setLines] = useState(null);
  useEffect(() => {
    let live = true;
    hydrateLines(sub.lines, { plan: sub.plan, fetchProduct }).then((l) => live && setLines(l)).catch(notifyError);
    return () => { live = false; };
  }, [sub.lines]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = useApiMutation({
    mutationFn: (body) => api.patch(`/subscriptions/${sub.id}`, body),
    invalidate: [['subscription', sub.id], ['subscriptions']],
    success: 'Lines saved',
  });
  if (!lines) return null;
  const problems = lineProblems(lines, { plan: sub.plan });
  const onSave = () => {
    if (Object.keys(problems).length) return notifyError({ message: Object.values(problems)[0] });
    save.mutate(editable ? { lines: linesToPayload(lines) } : (() => {
      const { quantities, addAddons, removeLineIds } = runningChanges(sub.lines, lines);
      return { quantities, addAddons, removeLineIds };
    })());
  };
  return (
    <Card>
      <CardHeader action={(editable || running) && <Button size="sm" loading={save.isPending} onClick={onSave}>Save lines</Button>}>
        <CardTitle>Lines</CardTitle>
      </CardHeader>
      <CardContent>
        <LinesEditor lines={lines} onChange={setLines} plan={sub.plan} mode={editable ? 'full' : running ? 'running' : 'readonly'} problems={problems} />
      </CardContent>
    </Card>
  );
}

export function SubscriptionDetailPage() {
  const { id } = useParams();
  const { role } = useAuth();
  const q = useRecord('subscription', '/subscriptions', id);
  const [action, setAction] = useState(null);
  const [note, setNote] = useState('');
  const [discountId, setDiscountId] = useState(null);
  const inv = [['subscription', id], ['subscriptions'], ...FINANCE_KEYS];
  const run = useApiMutation({
    mutationFn: ({ path, body }) => api.post(`/subscriptions/${id}/${path}`, body),
    invalidate: inv,
    success: (_, v) => v.msg,
    onSuccess: () => { setAction(null); setNote(''); },
  });
  const attach = useApiMutation({
    mutationFn: () => api.post(`/subscriptions/${id}/discounts`, { discountId }),
    invalidate: inv, success: 'Discount attached', onSuccess: () => setDiscountId(null),
  });
  const detach = useApiMutation({
    mutationFn: (did) => api.delete(`/subscriptions/${id}/discounts/${did}`),
    invalidate: inv, success: 'Discount removed',
  });

  return (
    <QueryState query={q} notFound={<EmptyState title="Subscription not found" />}>
      {(s) => {
        const allowed = s.allowedActions ?? [];
        const transitions = allowed.filter((a) => ACTION_LABELS[a]);
        return (
          <Page>
            <PageHeader
              title={<>{s.number} <StatusBadge status={s.status} /></>}
              crumbs={[{ label: 'Subscriptions', to: '/app/subscriptions' }, { label: s.number }]}
              description={`${s.customer?.name ?? s.customerName ?? ''} · ${s.plan?.name ?? s.planName ?? ''}`}
              actions={
                <>
                  {allowed.includes('invoice') && <Button variant="secondary" onClick={() => run.mutate({ path: 'invoices', msg: 'Invoice created' })}>Invoice now</Button>}
                  {allowed.includes('renew') && <Button variant="secondary" onClick={() => run.mutate({ path: 'renew', msg: 'Subscription renewed' })}>Renew</Button>}
                  {transitions.map((t) => (
                    <Button key={t} variant={t === 'closed' ? 'danger-quiet' : t === 'draft' || t === 'paused' ? 'secondary' : 'primary'} onClick={() => setAction(t)}>
                      {ACTION_LABELS[t]}
                    </Button>
                  ))}
                </>
              }
            />
            <Card><CardContent><StatusStepper status={s.status} /></CardContent></Card>
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="space-y-5 lg:col-span-2">
                <LinesCard sub={s} />
                <Card>
                  <CardHeader><CardTitle>Recent invoices</CardTitle></CardHeader>
                  <CardContent>
                    <SimpleTable
                      label="Invoices" rows={s.recentInvoices} empty={<p className="type-caption text-muted-foreground">No invoices yet.</p>}
                      columns={[
                        { id: 'n', header: 'Number', cell: (i) => <a className="font-mono text-link" href={`/app/invoices/${i.id}`}>{i.number}</a> },
                        { id: 's', header: 'Status', cell: (i) => <InvoiceStatusBadge invoice={i} /> },
                        { id: 'd', header: 'Date', cell: (i) => <DateCell value={i.invoiceDate} /> },
                        { id: 't', header: 'Total', numeric: true, cell: (i) => <MoneyCell value={i.total} /> },
                      ]}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>History</CardTitle></CardHeader>
                  <CardContent><ActivityTimeline items={s.history} /></CardContent>
                </Card>
              </div>
              <div className="space-y-5">
                <Card>
                  <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                  <CardContent>
                    <DetailList items={[
                      { label: 'Plan', value: `${s.plan?.name ?? ''} · ${formatMoney(s.plan?.price)} ${s.plan ? perPeriod(s.plan.billingPeriod, s.plan.intervalCount) : ''}` },
                      { label: 'Start date', value: <DateCell value={s.startDate} /> },
                      { label: 'Expiry', value: <DateCell value={s.expiryDate} /> },
                      { label: 'Next invoice', value: <DateCell value={s.nextInvoiceDate} /> },
                      s.quoteValidUntil && { label: 'Quote valid until', value: <DateCell value={s.quoteValidUntil} /> },
                      { label: 'MRR', value: <MoneyCell value={s.mrr} /> },
                      { label: 'Notes', value: s.notes },
                    ]} />
                  </CardContent>
                </Card>
                {s.totals && (
                  <Card>
                    <CardHeader><CardTitle>Next invoice</CardTitle></CardHeader>
                    <CardContent>
                      <DetailList items={[
                        { label: 'Period', value: `${s.totals.periodStart} → ${s.totals.periodEnd}` },
                        { label: 'Subtotal', value: <MoneyCell value={s.totals.subtotal} /> },
                        { label: 'Discount', value: <MoneyCell value={s.totals.discountTotal} /> },
                        { label: 'Tax', value: <MoneyCell value={s.totals.taxTotal} /> },
                        { label: 'Total', value: <MoneyCell value={s.totals.total} className="font-semibold" /> },
                      ]} />
                    </CardContent>
                  </Card>
                )}
                <Card>
                  <CardHeader><CardTitle>Discounts</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {(s.discounts ?? []).map((d) => (
                      <div key={d.id ?? d.discountId} className="flex items-center justify-between text-[0.8125rem]">
                        <span>{d.name}</span>
                        {role === 'admin' && <Button size="sm" variant="danger-quiet" onClick={() => detach.mutate(d.discountId ?? d.id)}>Remove</Button>}
                      </div>
                    ))}
                    {!s.discounts?.length && <p className="type-caption text-muted-foreground">None attached.</p>}
                    {role === 'admin' && s.status !== 'closed' && (
                      <div className="flex gap-2">
                        <DiscountPicker scope="subscription" value={discountId} onChange={(x) => setDiscountId(x)} className="flex-1" />
                        <Button variant="secondary" disabled={!discountId} loading={attach.isPending} onClick={() => attach.mutate()}>Attach</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            <ConfirmDialog
              open={Boolean(action)} onClose={() => setAction(null)}
              title={action ? ACTION_LABELS[action] : ''} confirmLabel={action ? ACTION_LABELS[action] : 'Confirm'}
              tone={action === 'closed' ? 'danger' : 'primary'} loading={run.isPending}
              onConfirm={() => run.mutate({ path: 'transition', body: { to: action, note: note || undefined, ...(action === 'closed' && role === 'admin' ? { force: true } : {}) }, msg: `Subscription ${action}` })}
            >
              <Field label="Note (optional)"><Textarea value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            </ConfirmDialog>
          </Page>
        );
      }}
    </QueryState>
  );
}
