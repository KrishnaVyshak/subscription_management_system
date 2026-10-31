import { api } from '@/lib/api';
import { discountValueLabel, formatMoney, perPeriod, PRODUCT_TYPE_LABELS } from '@/lib/format';
import { EntityCombobox } from './entity-combobox';

const list = (url, extra) => (search) =>
  api.get(url, { search, pageSize: 20, ...extra }).then(({ data }) => data);

export function CustomerPicker(props) {
  return (
    <EntityCombobox
      queryKey={['customers']}
      fetchOptions={list('/customers', { sort: 'name' })}
      getLabel={(c) => c.name}
      getDescription={(c) => c.email}
      placeholder="Search customers…"
      {...props}
    />
  );
}

/** `type` limits to one product type (e.g. 'addon'). */
export function ProductPicker({ type, ...props }) {
  return (
    <EntityCombobox
      queryKey={['products', type ?? 'all']}
      fetchOptions={list('/products', { sort: 'name', type })}
      getLabel={(p) => p.name}
      getDescription={(p) => `${PRODUCT_TYPE_LABELS[p.type]} · ${formatMoney(p.salesPrice)}`}
      placeholder="Search products…"
      {...props}
    />
  );
}

/** `available` limits to plans that are active and inside their availability window today. */
export function PlanPicker({ available = false, ...props }) {
  return (
    <EntityCombobox
      queryKey={['plans', available ? 'available' : 'all']}
      fetchOptions={list('/plans', { sort: 'name', available: available || undefined })}
      getLabel={(p) => p.name}
      getDescription={(p) =>
        `${p.productName ?? ''} · ${formatMoney(p.price)} ${perPeriod(p.billingPeriod, p.intervalCount)}`
      }
      placeholder="Search plans…"
      {...props}
    />
  );
}

/** Discounts in a given scope that are usable now. */
export function DiscountPicker({ scope, ...props }) {
  return (
    <EntityCombobox
      queryKey={['discounts', scope ?? 'all', 'active']}
      fetchOptions={list('/discounts', { scope, state: 'active', sort: 'name' })}
      getLabel={(d) => d.name}
      getDescription={(d) =>
        `${discountValueLabel(d)} off${d.usageLimit ? ` · ${d.usageCount} / ${d.usageLimit} used` : ''}`
      }
      placeholder="Search discounts…"
      {...props}
    />
  );
}
