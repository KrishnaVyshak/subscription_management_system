import { isLineActiveOn } from '../../domain/mrr.js';
import { D, fmt } from '../../lib/money.js';

// Day the next invoice would cover: the next unbilled period start, or the start date.
export function nextBillingDay(sub, today) {
  if (sub.status === 'active' || sub.status === 'paused') return sub.next_invoice_date ?? today;
  return sub.start_date;
}

// Next-invoice totals preview (subtotal only until the invoice calculator exists).
export async function previewNextInvoice(_db, sub, lines, today) {
  const day = nextBillingDay(sub, today);
  if (sub.status === 'closed') return null;
  const active = lines.filter((l) => isLineActiveOn(l, day));
  const subtotal = active.reduce((acc, l) => acc.plus(new D(l.unit_price).times(l.quantity)), new D(0));
  return { invoice_date: day, subtotal: fmt(subtotal) };
}

export async function recentInvoices() {
  return [];
}
