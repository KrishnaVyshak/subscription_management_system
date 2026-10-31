import { lineUnitPrice } from '../../domain/pricing.js';
import { ValidationError } from '../../lib/errors.js';
import { fmt } from '../../lib/money.js';

/**
 * Validates and prices lines in two queries. Input lines: { productId, variantId?, quantity,
 * unitPrice?, description? }. Output adds product_type, unit_price (given or computed from the
 * plan/product price plus variant extras), description and the product's tax ids.
 */
export async function resolveLines(db, lines, plan) {
  if (lines.length === 0) return [];
  const productIds = [...new Set(lines.map((l) => l.productId))];
  const variantIds = [...new Set(lines.map((l) => l.variantId).filter(Boolean))];

  const [{ rows: products }, { rows: variants }] = await Promise.all([
    db.query(
      `select p.id, p.name, p.type, p.sales_price, p.is_active,
              coalesce(array_agg(pt.tax_id) filter (where pt.tax_id is not null), '{}') as tax_ids
         from products p left join product_taxes pt on pt.product_id = p.id
        where p.id = any($1) group by p.id`,
      [productIds],
    ),
    db.query(
      `select v.id, v.product_id, v.name, v.is_active,
              coalesce(array_agg(av.extra_price::text) filter (where av.id is not null), '{}') as extras
         from product_variants v
         left join product_variant_values pvv on pvv.variant_id = v.id
         left join attribute_values av on av.id = pvv.attribute_value_id
        where v.id = any($1) group by v.id`,
      [variantIds],
    ),
  ]);
  const productById = new Map(products.map((p) => [p.id, p]));
  const variantById = new Map(variants.map((v) => [v.id, v]));

  return lines.map((line, index) => {
    const product = productById.get(line.productId);
    if (!product) throw new ValidationError('Unknown product', { line: index, productId: line.productId });
    if (!product.is_active) {
      throw new ValidationError(`${product.name} is no longer sold`, { line: index });
    }
    let variant = null;
    if (line.variantId) {
      variant = variantById.get(line.variantId);
      if (!variant || variant.product_id !== product.id) {
        throw new ValidationError('The variant does not belong to this product', { line: index });
      }
    }
    const computed = lineUnitPrice({ product, plan, extraPrices: variant?.extras ?? [] });
    return {
      product_id: product.id,
      variant_id: variant?.id ?? null,
      product_type: product.type,
      description: line.description || variant?.name || product.name,
      quantity: line.quantity,
      unit_price: line.unitPrice != null ? fmt(line.unitPrice) : fmt(computed),
      tax_ids: product.tax_ids,
    };
  });
}
