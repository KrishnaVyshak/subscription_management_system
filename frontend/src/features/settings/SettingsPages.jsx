import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiMutation } from '@/api/factory';
import { useCanEdit } from '@/auth/context';
import { EntityCombobox } from '@/components/app/entity-combobox';
import { LinesEditor } from '@/components/app/lines-editor';
import { Page, PageHeader } from '@/components/app/page-header';
import { ResourcePage } from '@/components/app/resource-page';
import { QueryState } from '@/components/app/states';
import { MoneyCell } from '@/components/app/cells';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { nullIfEmpty } from '@/lib/forms';
import { linesToPayload } from '@/lib/lines';
import { PlanPicker } from '@/components/app/pickers';

export function TemplatesPage() {
  return (
    <ResourcePage
      title="Templates" description="Reusable quotations with a plan and lines." url="/templates" qk="templates" entity="Template"
      createLabel="New template" canWrite deletable wide
      blank={{ name: '', planId: null, paymentTermId: '', validityDays: 30, notes: '', lines: [] }}
      columns={[
        { id: 'name', header: 'Name', primary: true, cell: (r) => <span className="font-medium">{r.name}</span> },
        { id: 'plan', header: 'Plan', cell: (r) => r.planName ?? '—' },
        { id: 'valid', header: 'Validity', cell: (r) => `${r.validityDays} days` },
        { id: 'lines', header: 'Lines', numeric: true, cell: (r) => r.lines?.length ?? r.lineCount ?? 0 },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'planId', label: 'Plan', required: true, type: 'custom', render: (v, set) => <PlanPicker value={v} onChange={(id) => set(id)} clearable={false} /> },
        { name: 'validityDays', label: 'Validity (days)', type: 'number', min: 1 },
        { name: 'notes', label: 'Notes', type: 'textarea' },
        {
          name: 'lines', label: 'Lines', type: 'custom',
          render: (v, set) => <LinesEditor lines={v ?? []} onChange={set} previewNote="" />,
        },
      ]}
      toInitial={(r) => ({
        name: r.name, planId: r.planId, paymentTermId: r.paymentTermId ?? '', validityDays: r.validityDays, notes: r.notes ?? '',
        lines: (r.lines ?? []).map((l, i) => ({
          key: `l${i}`, id: l.id, productId: l.productId, productName: l.productName ?? l.description, variantId: l.variantId ?? null,
          quantity: l.quantity, unitPrice: l.unitPrice ?? '', priceSource: l.unitPrice == null ? 'default' : 'existing', taxes: l.taxes ?? [],
        })),
      })}
      toPayload={(v) => ({
        name: v.name, planId: v.planId, validityDays: Number(v.validityDays) || 30,
        notes: nullIfEmpty(v.notes) ?? undefined,
        lines: linesToPayload(v.lines ?? []),
      })}
    />
  );
}

export function CompanyPage() {
  const admin = useCanEdit();
  const q = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/settings').then((r) => r.data) });
  const [co, setCo] = useState({ name: '', address: '', email: '', phone: '', gstin: '' });
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    if (!q.data) return;
    const get = (k) => q.data.find((s) => s.key === k)?.value;
    setCo((c) => ({ ...c, ...(get('company') ?? {}) }));
    setAuto(Boolean(get('invoice.auto_confirm')));
  }, [q.data]);
  const save = useApiMutation({
    mutationFn: ({ key, value }) => api.put(`/settings/${key}`, { value }),
    invalidate: [['settings']],
    success: 'Settings saved',
  });
  const f = (k) => ({ value: co[k] ?? '', disabled: !admin, onChange: (e) => setCo({ ...co, [k]: e.target.value }) });
  return (
    <Page>
      <PageHeader title="Company" description="Appears on invoices and emails." />
      <QueryState query={q}>
        {() => (
          <>
            <Card>
              <CardContent className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
                <Field label="Company name"><Input {...f('name')} /></Field>
                <Field label="Email"><Input type="email" {...f('email')} /></Field>
                <Field label="Phone"><Input {...f('phone')} /></Field>
                <Field label="GSTIN"><Input {...f('gstin')} /></Field>
                <Field label="Address" className="sm:col-span-2"><Textarea {...f('address')} /></Field>
                {admin && (
                  <div className="sm:col-span-2">
                    <Button loading={save.isPending} onClick={() => save.mutate({ key: 'company', value: co })}>Save company</Button>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4 text-[0.8125rem] sm:p-6">
                <Switch checked={auto} disabled={!admin} onCheckedChange={(x) => { setAuto(x); save.mutate({ key: 'invoice.auto_confirm', value: x }); }} id="auto" />
                <label htmlFor="auto"><span className="font-medium">Auto-confirm invoices</span><span className="block text-muted-foreground">Billing runs confirm new invoices instead of leaving drafts.</span></label>
              </CardContent>
            </Card>
          </>
        )}
      </QueryState>
    </Page>
  );
}

export { EntityCombobox, MoneyCell };
