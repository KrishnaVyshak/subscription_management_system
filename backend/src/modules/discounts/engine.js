import { D, fmt } from '../../lib/money.js';
import * as domain from '../../domain/discounts.js';

// Product discounts for the products on these lines, plus the subscription's attached ones.
async function loadCandidates(db, subscriptionId, lines) {
  const productIds = [...new Set(lines.map((l) => l.product_id))];
  const { rows: productDiscounts } = await db.query(
    `select d.*, array_agg(dp.product_id) as product_ids
       from discounts d join discount_products dp on dp.discount_id = d.id
      where d.scope = 'product' and d.is_active
        and d.id in (select discount_id from discount_products where product_id = any($1))
      group by d.id`,
    [productIds],
  );
  const { rows: subscriptionDiscounts } = await db.query(
    `select d.* from subscription_discounts sd join discounts d on d.id = sd.discount_id
      where sd.subscription_id = $1 and d.scope = 'subscription' and d.is_active`,
    [subscriptionId],
  );
  return { productDiscounts, subscriptionDiscounts };
}

// What would apply on invoiceDate (used for previews; nothing is claimed).
export async function pickDiscounts(db, { sub, lines, invoiceDate, exclude }) {
  if (lines.length === 0) return { lineDiscounts: new Map(), invoiceDiscount: null };
  const candidates = await loadCandidates(db, sub.id, lines);
  return domain.pickDiscounts({ ...candidates, lines, invoiceDate, exclude });
}

async function claim(client, id) {
  const { rows } = await client.query(
    `update discounts set usage_count = usage_count + 1
      where id = $1 and is_active and (usage_limit is null or usage_count < usage_limit)
      returning id`,
    [id],
  );
  return rows.length > 0;
}

export async function releaseClaims(client, ids) {
  if (!ids?.length) return;
  await client.query(
    'update discounts set usage_count = usage_count - 1 where id = any($1) and usage_count > 0',
    [ids],
  );
}

/**
 * Picks discounts and claims one use of each atomically. A discount that cannot be claimed
 * (limit reached meanwhile) is dropped and the pick is recomputed without it.
 * Returns the pick plus `claimedIds` (each used once for this invoice).
 */
export async function claimDiscounts(client, { sub, lines, invoiceDate }) {
  if (lines.length === 0) return { lineDiscounts: new Map(), invoiceDiscount: null, claimedIds: [] };
  const candidates = await loadCandidates(client, sub.id, lines);
  const exclude = new Set();
  const claimed = new Set();

  for (;;) {
    const picked = domain.pickDiscounts({ ...candidates, lines, invoiceDate, exclude });
    const needed = domain.pickedIds(picked);
    let failed = false;
    // Claim in id order so concurrent billers never lock discount rows in opposite orders.
    for (const id of [...needed].sort()) {
      if (claimed.has(id)) continue;
      if (await claim(client, id)) claimed.add(id);
      else {
        exclude.add(id);
        failed = true;
      }
    }
    if (!failed) {
      await releaseClaims(client, [...claimed].filter((id) => !needed.includes(id)));
      return { ...picked, claimedIds: needed };
    }
  }
}

// One usage row per discount per invoice, with the amount it took off.
export async function recordUsages(client, { invoiceId, sub, picked, calc }) {
  const amounts = new Map();
  for (const line of calc.lines) {
    const d = picked.lineDiscounts.get(line.id);
    if (d) amounts.set(d.id, (amounts.get(d.id) ?? new D(0)).plus(line.line_discount));
  }
  if (picked.invoiceDiscount) {
    const id = picked.invoiceDiscount.id;
    amounts.set(id, (amounts.get(id) ?? new D(0)).plus(calc.invoice_discount_total));
  }
  for (const [discountId, amount] of amounts) {
    await client.query(
      `insert into discount_usages (discount_id, invoice_id, subscription_id, amount)
       values ($1, $2, $3, $4)`,
      [discountId, invoiceId, sub.id, fmt(amount)],
    );
  }
}

// Cancelling an invoice frees the uses it took.
export async function releaseInvoiceUsages(client, invoiceId) {
  const { rows } = await client.query(
    'delete from discount_usages where invoice_id = $1 returning discount_id',
    [invoiceId],
  );
  await releaseClaims(client, rows.map((r) => r.discount_id));
}
