import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { DateCell, MoneyCell } from '@/components/app/cells';
import { EntityCombobox } from '@/components/app/entity-combobox';
import { ResourcePage } from '@/components/app/resource-page';
import { api } from '@/lib/api';
import { discountValueLabel, perPeriod, PRODUCT_TYPE_LABELS, ROLE_LABELS, taxRateLabel } from '@/lib/format';
import { nullIfEmpty } from '@/lib/forms';

const active = (r) => (
  <Badge tone={r.isActive === false ? 'neutral' : 'success'} dot>
    {r.isActive === false ? 'Inactive' : 'Active'}
  </Badge>
);
const opts = (o) => Object.entries(o).map(([value, label]) => ({ value, label }));
const PERIODS = ['daily', 'weekly', 'monthly', 'yearly'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
const nameCell = (r) => <span className="font-medium">{r.name}</span>;
const numOrNull = (v) => (nullIfEmpty(v) === null ? null : Number(v));

export function TaxesPage() {
  return (
    <ResourcePage
      title="Taxes" description="Rates applied to products and invoice lines." url="/taxes" qk="taxes" entity="Tax"
      createLabel="New tax" deletable searchable={false}
      blank={{ name: '', type: 'percent', rate: '', priceIncluded: false }}
      columns={[
        { id: 'name', header: 'Name', primary: true, cell: nameCell },
        { id: 'rate', header: 'Rate', cell: (r) => taxRateLabel(r) },
        { id: 'inc', header: 'Price included', cell: (r) => (r.priceIncluded ? 'Yes' : 'No') },
        { id: 'st', header: 'Status', cell: active },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'type', label: 'Type', type: 'select', options: [{ value: 'percent', label: 'Percent' }, { value: 'fixed', label: 'Fixed amount' }] },
        { name: 'rate', label: 'Rate', type: 'number', step: '0.01', required: true, hint: 'A percent rate: 18 means 18 %' },
        { name: 'priceIncluded', label: 'Price already includes this tax', type: 'switch' },
      ]}
      toPayload={(v) => ({ name: v.name, type: v.type, rate: Number(v.rate), priceIncluded: Boolean(v.priceIncluded) })}
    />
  );
}

export function PaymentTermsPage() {
  return (
    <ResourcePage
      title="Payment terms" description="How many days a customer has to pay." url="/payment-terms" qk="payment-terms"
      entity="Payment term" createLabel="New term" deletable searchable={false}
      blank={{ name: '', dueDays: 15 }}
      columns={[
        { id: 'name', header: 'Name', primary: true, cell: nameCell },
        { id: 'days', header: 'Due in', cell: (r) => `${r.dueDays} days` },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'dueDays', label: 'Due days', type: 'number', min: 0, required: true },
      ]}
      toPayload={(v) => ({ name: v.name, dueDays: Number(v.dueDays) })}
    />
  );
}

export function AttributesPage() {
  return (
    <ResourcePage
      title="Attributes" description="Variant options such as Brand or Plan tier." url="/attributes" qk="attributes"
      entity="Attribute" createLabel="New attribute" searchable={false}
      blank={{ name: '', values: '' }}
      columns={[
        { id: 'name', header: 'Name', primary: true, cell: nameCell },
        {
          id: 'values',
          header: 'Values',
          cell: (r) => (
            <span className="flex flex-wrap gap-1">
              {(r.values ?? []).map((v) => (
                <Badge key={v.id} tone="outline">
                  {v.value}
                  {Number(v.extraPrice) ? ` +${v.extraPrice}` : ''}
                </Badge>
              ))}
            </span>
          ),
        },
        { id: 'st', header: 'Status', cell: active },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'values', label: 'Values', type: 'textarea', createOnly: true, hint: 'One per line; add an extra price after a colon, e.g. Odoo:500' },
        { name: 'isActive', label: 'Active', type: 'switch', editOnly: true },
      ]}
      toInitial={(r) => ({ name: r.name, isActive: r.isActive })}
      toPayload={(v, editing) =>
        editing
          ? { name: v.name, isActive: Boolean(v.isActive) }
          : {
              name: v.name,
              values: String(v.values || '')
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((s) => {
                  const [value, extra] = s.split(':');
                  return { value: value.trim(), extraPrice: String(Number(extra) || 0) };
                }),
            }
      }
    />
  );
}

export function ProductsPage() {
  return (
    <ResourcePage
      title="Products" description="Services, goods and add-ons you sell." url="/products" qk="products" entity="Product"
      createLabel="New product" deletable defaultSort="name"
      filters={[{ name: 'type', label: 'Type', options: opts(PRODUCT_TYPE_LABELS) }]}
      blank={{ name: '', type: 'service', salesPrice: '', costPrice: '', notes: '', taxIds: [] }}
      columns={[
        { id: 'name', header: 'Name', sortKey: 'name', primary: true, cell: nameCell },
        { id: 'type', header: 'Type', sortKey: 'type', cell: (r) => PRODUCT_TYPE_LABELS[r.type] },
        { id: 'price', header: 'Sales price', sortKey: 'salesPrice', numeric: true, cell: (r) => <MoneyCell value={r.salesPrice} /> },
        { id: 'cost', header: 'Cost', numeric: true, mobile: false, cell: (r) => <MoneyCell value={r.costPrice} /> },
        { id: 'st', header: 'Status', cell: active },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'type', label: 'Type', type: 'select', options: opts(PRODUCT_TYPE_LABELS) },
        { name: 'salesPrice', label: 'Sales price (₹)', type: 'number', step: '0.01', required: true },
        { name: 'costPrice', label: 'Cost price (₹)', type: 'number', step: '0.01' },
        { name: 'taxIds', label: 'Taxes', type: 'multi', optionsUrl: '/taxes', optionLabel: (t) => `${t.name} (${taxRateLabel(t)})` },
        { name: 'notes', label: 'Notes', type: 'textarea' },
      ]}
      toInitial={(r) => ({ ...r, costPrice: r.costPrice ?? '', notes: r.notes ?? '', taxIds: (r.taxes ?? []).map((t) => t.id) })}
      toPayload={(v) => ({
        name: v.name,
        type: v.type,
        salesPrice: String(v.salesPrice),
        costPrice: nullIfEmpty(v.costPrice) === null ? undefined : String(v.costPrice),
        notes: nullIfEmpty(v.notes) ?? undefined,
        taxIds: v.taxIds ?? [],
      })}
    />
  );
}

const planFields = [
  { name: 'name', label: 'Name', required: true },
  {
    name: 'productId',
    label: 'Product',
    required: true,
    type: 'custom',
    render: (v, set) => (
      <EntityCombobox
        queryKey={['products', 'plan']}
        value={v}
        getLabel={(p) => p.name}
        placeholder="Search products…"
        clearable={false}
        fetchOptions={(search) => api.get('/products', { search, pageSize: 20 }).then((r) => r.data)}
        onChange={(id) => set(id)}
      />
    ),
  },
  { name: 'price', label: 'Price (₹)', type: 'number', step: '0.01', required: true },
  { name: 'billingPeriod', label: 'Billing period', type: 'select', options: PERIODS },
  { name: 'intervalCount', label: 'Every N periods', type: 'number', min: 1 },
  { name: 'minQuantity', label: 'Minimum quantity', type: 'number', min: 1 },
  { name: 'availableFrom', label: 'Available from', type: 'date' },
  { name: 'availableTo', label: 'Available to', type: 'date' },
  { name: 'autoClose', label: 'Auto-close at expiry', type: 'switch' },
  { name: 'closable', label: 'Customer can close early', type: 'switch' },
  { name: 'pausable', label: 'Can be paused', type: 'switch' },
  { name: 'renewable', label: 'Renewable', type: 'switch' },
];

export function PlansPage() {
  return (
    <ResourcePage
      title="Plans" description="Recurring prices and the rules each subscription follows." url="/plans" qk="plans"
      entity="Plan" createLabel="New plan" deletable defaultSort="name"
      filters={[{ name: 'billingPeriod', label: 'Period', options: PERIODS }]}
      blank={{ name: '', productId: null, price: '', billingPeriod: 'monthly', intervalCount: 1, minQuantity: 1, availableFrom: '', availableTo: '', autoClose: false, closable: true, pausable: false, renewable: false }}
      columns={[
        { id: 'name', header: 'Name', sortKey: 'name', primary: true, cell: nameCell },
        { id: 'product', header: 'Product', cell: (r) => r.productName },
        {
          id: 'price', header: 'Price', sortKey: 'price', numeric: true,
          cell: (r) => (
            <>
              <MoneyCell value={r.price} /> <span className="type-caption text-muted-foreground">{perPeriod(r.billingPeriod, r.intervalCount)}</span>
            </>
          ),
        },
        {
          id: 'flags', header: 'Rules', mobile: false,
          cell: (r) => (
            <span className="flex flex-wrap gap-1">
              {r.pausable && <Badge tone="outline">Pausable</Badge>}
              {r.renewable && <Badge tone="outline">Renewable</Badge>}
              {r.autoClose && <Badge tone="outline">Auto-close</Badge>}
            </span>
          ),
        },
        { id: 'st', header: 'Status', cell: active },
      ]}
      fields={planFields}
      toInitial={(r) => ({ ...r, availableFrom: r.availableFrom ?? '', availableTo: r.availableTo ?? '' })}
      toPayload={(v) => ({
        name: v.name,
        productId: v.productId,
        price: String(v.price),
        billingPeriod: v.billingPeriod,
        intervalCount: Number(v.intervalCount) || 1,
        minQuantity: Number(v.minQuantity) || 1,
        availableFrom: nullIfEmpty(v.availableFrom),
        availableTo: nullIfEmpty(v.availableTo),
        autoClose: Boolean(v.autoClose),
        closable: Boolean(v.closable),
        pausable: Boolean(v.pausable),
        renewable: Boolean(v.renewable),
      })}
    />
  );
}

export function DiscountsPage() {
  const states = ['scheduled', 'active', 'expired', 'exhausted', 'inactive'].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));
  return (
    <ResourcePage
      title="Discounts" description="Percent or fixed reductions, by product or across a subscription." url="/discounts" qk="discounts"
      entity="Discount" createLabel="New discount" deletable defaultSort="-createdAt"
      filters={[
        { name: 'state', label: 'State', options: states },
        { name: 'scope', label: 'Scope', options: [{ value: 'product', label: 'Product' }, { value: 'subscription', label: 'Subscription' }] },
      ]}
      blank={{ name: '', type: 'percent', value: '', scope: 'subscription', minAmount: '', minQuantity: '', startDate: '', endDate: '', usageLimit: '', productIds: [] }}
      columns={[
        { id: 'name', header: 'Name', sortKey: 'name', primary: true, cell: nameCell },
        { id: 'value', header: 'Value', cell: (r) => discountValueLabel(r) },
        { id: 'scope', header: 'Scope', cell: (r) => (r.scope === 'product' ? 'Product' : 'Subscription') },
        { id: 'use', header: 'Used', sortKey: 'usageCount', numeric: true, cell: (r) => `${r.usageCount ?? 0}${r.usageLimit ? ` / ${r.usageLimit}` : ''}` },
        { id: 'end', header: 'Ends', sortKey: 'endDate', cell: (r) => <DateCell value={r.endDate} /> },
        { id: 'state', header: 'State', cell: (r) => <StatusBadge status={r.state} /> },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'type', label: 'Type', type: 'select', options: [{ value: 'percent', label: 'Percent' }, { value: 'fixed', label: 'Fixed amount' }] },
        { name: 'value', label: 'Value', type: 'number', step: '0.01', required: true },
        { name: 'scope', label: 'Scope', type: 'select', options: [{ value: 'subscription', label: 'Whole subscription' }, { value: 'product', label: 'Specific products' }] },
        { name: 'productIds', label: 'Products (product scope)', type: 'multi', optionsUrl: '/products' },
        { name: 'minAmount', label: 'Minimum amount (₹)', type: 'number', step: '0.01' },
        { name: 'minQuantity', label: 'Minimum quantity', type: 'number', min: 1 },
        { name: 'startDate', label: 'Starts', type: 'date' },
        { name: 'endDate', label: 'Ends', type: 'date' },
        { name: 'usageLimit', label: 'Usage limit', type: 'number', min: 1 },
      ]}
      toInitial={(r) => ({ ...r, minAmount: r.minAmount ?? '', minQuantity: r.minQuantity ?? '', startDate: r.startDate ?? '', endDate: r.endDate ?? '', usageLimit: r.usageLimit ?? '', productIds: r.productIds ?? [] })}
      toPayload={(v) => ({
        name: v.name,
        type: v.type,
        value: Number(v.value),
        scope: v.scope,
        minAmount: nullIfEmpty(v.minAmount) === null ? null : String(v.minAmount),
        minQuantity: numOrNull(v.minQuantity),
        startDate: nullIfEmpty(v.startDate),
        endDate: nullIfEmpty(v.endDate),
        usageLimit: numOrNull(v.usageLimit),
        productIds: v.scope === 'product' ? v.productIds : [],
      })}
    />
  );
}

export function UsersPage() {
  return (
    <ResourcePage
      title="Users" description="Staff and customer logins." url="/users" createUrl="/users/staff" qk="users" entity="Staff user"
      createLabel="Invite staff" defaultSort="-createdAt"
      filters={[{ name: 'role', label: 'Role', options: opts(ROLE_LABELS) }]}
      blank={{ email: '', fullName: '' }}
      columns={[
        { id: 'name', header: 'Name', sortKey: 'fullName', primary: true, cell: (r) => <span className="font-medium">{r.fullName}</span> },
        { id: 'email', header: 'Email', sortKey: 'email', cell: (r) => r.email },
        { id: 'role', header: 'Role', sortKey: 'role', cell: (r) => ROLE_LABELS[r.role] },
        { id: 'st', header: 'Status', cell: active },
      ]}
      fields={[
        { name: 'email', label: 'Email', type: 'email', required: true, createOnly: true },
        { name: 'fullName', label: 'Full name', required: true },
        { name: 'role', label: 'Role', type: 'select', editOnly: true, options: [{ value: 'admin', label: 'Admin' }, { value: 'staff', label: 'Staff' }] },
        { name: 'isActive', label: 'Active', type: 'switch', editOnly: true },
      ]}
      toInitial={(r) => ({ fullName: r.fullName, role: r.role === 'customer' ? 'staff' : r.role, isActive: r.isActive })}
      toPayload={(v, editing) =>
        editing ? { fullName: v.fullName, role: v.role, isActive: Boolean(v.isActive) } : { email: v.email, fullName: v.fullName }
      }
    />
  );
}
