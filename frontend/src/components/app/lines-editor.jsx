import { useState } from 'react';
import { CircleAlert, Plus, Trash2 } from 'lucide-react';
import { fetchProduct, useProduct } from '@/api/products';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { notifyError } from '@/lib/errors';
import { formatMoney, taxRateLabel } from '@/lib/format';
import { lineFromProduct } from '@/lib/lines';
import { defaultUnitPrice, previewTotals } from '@/lib/pricing';
import { cn } from '@/lib/utils';
import { ProductPicker } from './pickers';

const GRID =
  'grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)_4.5rem_8.5rem_minmax(0,1fr)_7.5rem_2.25rem] sm:items-center';

function MobileLabel({ children }) {
  return <span className="type-label text-subtle-foreground sm:hidden">{children}</span>;
}

function LineRow({ line, index, mode, plan, problem, onChange, onRemove, addonOnly }) {
  const product = useProduct(line.productId, { enabled: Boolean(line.productId) });
  const variants = (product.data?.variants ?? []).filter((v) => v.isActive || v.id === line.variantId);
  const [picking, setPicking] = useState(false);
  const running = mode === 'running';
  const readOnly = mode === 'readonly';
  // Running subscriptions: existing lines change quantity only; new lines are add-ons.
  const lockedProduct = readOnly || (running && !line.isNew) || line.isPlanLine;
  const lockedPrice = readOnly || running;
  const preview = previewTotals([line]).lines[0];

  const pickProduct = async (id) => {
    if (!id) return;
    setPicking(true);
    try {
      const p = await fetchProduct(id);
      const next = lineFromProduct(p, { plan, quantity: line.quantity || 1 });
      onChange({ ...next, key: line.key, id: line.id });
    } catch (err) {
      notifyError(err);
    } finally {
      setPicking(false);
    }
  };

  const pickVariant = (variantId) => {
    const variant = variants.find((v) => v.id === variantId) ?? null;
    const patch = { variantId: variantId || null };
    if (line.priceSource !== 'manual' && product.data) {
      patch.unitPrice = defaultUnitPrice({ product: product.data, variant, plan });
      patch.priceSource = 'default';
    }
    onChange({ ...line, ...patch });
  };

  return (
    <li className={cn(GRID, 'px-3 py-3 sm:px-4 sm:py-2.5')} aria-label={`Line ${index + 1}`}>
      <div className="min-w-0">
        <MobileLabel>Product</MobileLabel>
        {lockedProduct ? (
          <p className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] font-medium">
            {line.productName}
            {line.isPlanLine && <Badge tone="accent">Plan</Badge>}
            {line.productType === 'addon' && <Badge>Add-on</Badge>}
          </p>
        ) : (
          <ProductPicker
            aria-label={`Product for line ${index + 1}`}
            type={addonOnly ? 'addon' : undefined}
            value={line.productId}
            selected={line.productId ? { id: line.productId, name: line.productName } : null}
            onChange={pickProduct}
            clearable={false}
            disabled={picking}
          />
        )}
      </div>

      <div className="min-w-0">
        <MobileLabel>Variant</MobileLabel>
        {lockedProduct && !line.isPlanLine ? (
          <p className="truncate text-[0.8125rem] text-muted-foreground">
            {variants.find((v) => v.id === line.variantId)?.name ?? '—'}
          </p>
        ) : variants.length > 0 && !(running && !line.isNew) && !readOnly ? (
          <Select
            aria-label={`Variant for line ${index + 1}`}
            value={line.variantId ?? ''}
            onChange={(e) => pickVariant(e.target.value)}
          >
            <option value="">No variant</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} · {formatMoney(v.price)}
              </option>
            ))}
          </Select>
        ) : (
          <p className="truncate text-[0.8125rem] text-muted-foreground">
            {variants.find((v) => v.id === line.variantId)?.name ?? (line.productId ? 'No variants' : '—')}
          </p>
        )}
      </div>

      <div>
        <MobileLabel>Qty</MobileLabel>
        <Input
          type="number"
          min={1}
          step={1}
          inputMode="numeric"
          aria-label={`Quantity for line ${index + 1}`}
          aria-invalid={problem ? true : undefined}
          value={line.quantity}
          readOnly={readOnly}
          onChange={(e) => onChange({ ...line, quantity: e.target.value === '' ? '' : Number(e.target.value) })}
        />
      </div>

      <div>
        <MobileLabel>Unit price</MobileLabel>
        <Input
          type="text"
          inputMode="decimal"
          leading="₹"
          aria-label={`Unit price for line ${index + 1}`}
          value={line.unitPrice}
          readOnly={lockedPrice}
          className="[&_input]:text-right [&_input]:font-mono [&_input]:tabular-nums"
          onChange={(e) => onChange({ ...line, unitPrice: e.target.value.replace(/[^\d.]/g, ''), priceSource: 'manual' })}
        />
      </div>

      <div className="flex min-w-0 flex-wrap gap-1">
        <MobileLabel>Taxes</MobileLabel>
        {line.taxes?.length ? (
          line.taxes.map((t) => (
            <Badge key={t.id ?? t.name} tone="outline" title={t.priceIncluded ? 'Included in price' : undefined}>
              {t.name ?? taxRateLabel(t)}
              {t.priceIncluded ? ' incl.' : ''}
            </Badge>
          ))
        ) : (
          <span className="type-caption text-subtle-foreground">No tax</span>
        )}
      </div>

      <div className="text-right">
        <MobileLabel>Amount</MobileLabel>
        <span className="block font-mono text-[0.8125rem] tabular-nums">{formatMoney(preview.amount)}</span>
      </div>

      <div className="flex justify-end">
        {!readOnly && (
          <Button
            variant="tertiary"
            size="icon-sm"
            aria-label={`Remove line ${index + 1}`}
            title={line.isPlanLine ? "The plan's product line can't be removed" : 'Remove line'}
            disabled={line.isPlanLine || (running && !line.isNew && line.productType !== 'addon')}
            onClick={onRemove}
          >
            <Trash2 />
          </Button>
        )}
      </div>

      {problem && (
        <p className="flex items-center gap-1.5 type-caption text-danger-soft-foreground sm:col-span-full">
          <CircleAlert aria-hidden="true" className="size-3.5" /> {problem}
        </p>
      )}
    </li>
  );
}

/**
 * Rows of product, variant, quantity, unit price (defaulted from the catalog, editable), taxes
 * (inherited from the product: lines can't carry their own) and amount, with a live preview of
 * subtotal, discount, tax and total.
 *
 * mode: 'full' (draft, quotation, templates) | 'running' (active/paused: quantities and add-ons
 * only) | 'readonly'. `discounts` ({ type, value }[]) feed the preview only.
 */
export function LinesEditor({
  lines,
  onChange,
  mode = 'full',
  plan,
  discounts = [],
  problems = {},
  previewNote = 'Preview. The final amounts are calculated when the invoice is raised.',
  className,
}) {
  const totals = previewTotals(lines, discounts);
  const running = mode === 'running';
  const update = (key, next) => onChange(lines.map((l) => (l.key === key ? next : l)));
  const remove = (key) => onChange(lines.filter((l) => l.key !== key));
  const add = () =>
    onChange([
      ...lines,
      {
        key: `new-${Date.now()}`,
        productId: null,
        productName: '',
        variantId: null,
        quantity: 1,
        unitPrice: '',
        priceSource: 'default',
        taxes: [],
        isNew: true,
      },
    ]);

  return (
    <div className={cn('rounded-md border', className)}>
      <div className={cn(GRID, 'hidden border-b border-b-rule px-4 pt-2.5 pb-2 type-label text-muted-foreground sm:grid')}>
        <span>Product</span>
        <span>Variant</span>
        <span>Qty</span>
        <span className="text-right">Unit price</span>
        <span>Taxes</span>
        <span className="text-right">Amount</span>
        <span className="sr-only">Remove</span>
      </div>

      {lines.length === 0 ? (
        <p className="px-4 py-6 text-center type-caption text-muted-foreground">No lines yet.</p>
      ) : (
        <ul className="divide-y">
          {lines.map((line, i) => (
            <LineRow
              key={line.key}
              line={line}
              index={i}
              mode={mode}
              plan={plan}
              problem={problems[line.key]}
              addonOnly={running}
              onChange={(next) => update(line.key, next)}
              onRemove={() => remove(line.key)}
            />
          ))}
        </ul>
      )}

      {mode !== 'readonly' && (
        <div className="border-t px-3 py-2.5 sm:px-4">
          <Button variant="secondary" size="sm" onClick={add}>
            <Plus /> {running ? 'Add an add-on' : 'Add line'}
          </Button>
        </div>
      )}

      <dl className="space-y-1.5 border-t bg-sunken/40 px-4 py-3 font-mono text-[0.8125rem] tabular-nums" aria-label="Totals preview">
        <div className="flex justify-between gap-4">
          <dt className="font-sans text-muted-foreground">Subtotal</dt>
          <dd>{formatMoney(totals.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-sans text-muted-foreground">Discount</dt>
          <dd>{Number(totals.discountTotal) ? `− ${formatMoney(totals.discountTotal)}` : formatMoney(0)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="font-sans text-muted-foreground">Tax</dt>
          <dd>{formatMoney(totals.taxTotal)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t-2 border-rule pt-2">
          <dt className="font-sans font-semibold">Total</dt>
          <dd className="text-base font-medium tracking-[-0.03em]">{formatMoney(totals.total)}</dd>
        </div>
        {previewNote && <p className="pt-1 font-sans type-caption text-muted-foreground">{previewNote}</p>}
      </dl>
    </div>
  );
}
