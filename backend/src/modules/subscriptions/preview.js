import { calculateInvoice } from '../../domain/invoiceCalc.js';
import { isLineActiveOn } from '../../domain/mrr.js';
import { period } from '../../domain/periods.js';
import { fmt } from '../../lib/money.js';
import { pickDiscounts } from '../discounts/engine.js';

// The period the next invoice would cover.
export function nextPeriod(sub, today) {
  if (sub.status === 'active' || sub.status === 'paused') {
    if (!sub.billing_anchor_date) return null;
    return period(sub.billing_anchor_date, sub.billing_period, sub.interval_count, sub.periods_billed);
  }
  if (sub.status === 'closed') return null;
  return period(sub.start_date ?? today, sub.billing_period, sub.interval_count, 0);
}

// Next-invoice totals with taxes and the discounts that would apply (nothing is claimed).
export async function previewNextInvoice(db, sub, lines, today) {
  const p = nextPeriod(sub, today);
  if (!p) return null;
  const active = lines.filter((l) => isLineActiveOn(l, p.start));
  const picked = await pickDiscounts(db, { sub, lines: active, invoiceDate: p.start });
  const calc = calculateInvoice(
    active.map((l) => ({ ...l, lineDiscount: picked.lineDiscounts.get(l.id) ?? null })),
    picked.invoiceDiscount,
  );
  return {
    period_start: p.start,
    period_end: p.end,
    invoice_date: p.start,
    subtotal: fmt(calc.subtotal),
    discount_total: fmt(calc.discount_total),
    tax_total: fmt(calc.tax_total),
    total: fmt(calc.total),
  };
}

export async function recentInvoices(db, subscriptionId, limit = 5) {
  const { rows } = await db.query(
    `select id, number, status, period_start, period_end, invoice_date, due_date,
            total, amount_paid, amount_due
       from invoices where subscription_id = $1
      order by period_start desc, created_at desc limit $2`,
    [subscriptionId, limit],
  );
  return rows;
}
