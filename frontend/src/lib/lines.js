import { defaultUnitPrice } from './pricing';

// Lines editor state. A line:
//   { key, id?, productId, productName, productType, variantId, quantity, unitPrice,
//     priceSource: 'default' | 'manual' | 'existing', taxes, isPlanLine?, isNew? }
// 'default' prices are sent as null so the server prices them (current plan/product price +
// variant extras); 'manual' and 'existing' prices are sent as typed.

let seq = 0;
export const lineKey = () => `line-${Date.now().toString(36)}-${(seq += 1)}`;

/** A fresh line for a product (product = GET /products/:id, so it carries variants and taxes). */
export function lineFromProduct(product, { plan, variant = null, quantity = 1 } = {}) {
  return {
    key: lineKey(),
    productId: product.id,
    productName: product.name,
    productType: product.type,
    variantId: variant?.id ?? null,
    quantity,
    unitPrice: defaultUnitPrice({ product, variant, plan }),
    priceSource: 'default',
    taxes: product.taxes ?? [],
    isPlanLine: Boolean(plan && plan.productId === product.id),
    isNew: true,
  };
}

/**
 * Server lines → editor lines. `fetchProduct(id)` supplies taxes and the computed price for
 * template lines whose unitPrice is null ("use the current price").
 */
export async function hydrateLines(lines = [], { plan, fetchProduct }) {
  const products = new Map();
  await Promise.all(
    [...new Set(lines.map((l) => l.productId))].map(async (id) => products.set(id, await fetchProduct(id))),
  );
  return lines.map((l) => {
    const product = products.get(l.productId);
    const variant = product?.variants?.find((v) => v.id === l.variantId) ?? null;
    const hasPrice = l.unitPrice !== null && l.unitPrice !== undefined;
    return {
      key: lineKey(),
      id: l.id,
      productId: l.productId,
      productName: l.productName ?? product?.name ?? l.description,
      productType: l.productType ?? product?.type,
      variantId: l.variantId ?? null,
      quantity: l.quantity,
      unitPrice: hasPrice ? l.unitPrice : defaultUnitPrice({ product, variant, plan }),
      priceSource: hasPrice ? 'existing' : 'default',
      taxes: l.taxes?.length ? l.taxes : (product?.taxes ?? []),
      isPlanLine: l.isPlanLine ?? Boolean(plan && plan.productId === l.productId),
      description: l.description ?? null,
      isNew: false,
    };
  });
}

/** Editor lines → the API's `lines: [{ productId, variantId, quantity, unitPrice }]`. */
export function linesToPayload(lines) {
  return lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId || null,
    quantity: Number(l.quantity),
    unitPrice: l.priceSource === 'default' ? null : String(l.unitPrice),
  }));
}

/**
 * For running (active/paused) subscriptions: the diff the API takes.
 * original: the server's current lines; lines: the edited set (removed lines dropped).
 */
export function runningChanges(original, lines) {
  const byId = new Map(original.map((l) => [l.id, l]));
  const keptIds = new Set(lines.filter((l) => l.id).map((l) => l.id));
  const quantities = lines
    .filter((l) => l.id && byId.has(l.id) && Number(byId.get(l.id).quantity) !== Number(l.quantity))
    .map((l) => ({ lineId: l.id, quantity: Number(l.quantity) }));
  const addAddons = lines
    .filter((l) => !l.id)
    .map((l) => ({ productId: l.productId, variantId: l.variantId || null, quantity: Number(l.quantity) }));
  const removeLineIds = original.filter((l) => !keptIds.has(l.id)).map((l) => l.id);
  return { quantities, addAddons, removeLineIds };
}

/** Client checks before saving: a product on every line, whole quantities ≥ 1, prices ≥ 0. */
export function lineProblems(lines, { plan } = {}) {
  const problems = {};
  lines.forEach((l) => {
    const p = [];
    if (!l.productId) p.push('Choose a product');
    const q = Number(l.quantity);
    if (!Number.isInteger(q) || q < 1) p.push('Quantity must be a whole number of 1 or more');
    else if (l.isPlanLine && plan?.minQuantity && q < plan.minQuantity) {
      p.push(`This plan needs at least ${plan.minQuantity}`);
    }
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(String(l.unitPrice ?? ''))) p.push('Enter a price like 1000 or 1000.50');
    if (p.length) problems[l.key] = p[0];
  });
  return problems;
}
