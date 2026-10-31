import { format, parseISO } from 'date-fns';

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

const inrCompact = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  notation: 'compact',
  maximumFractionDigits: 1,
});

// Statements show paise: ₹1,24,500.00.
const inrExact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

// ₹1,24,500 or, with { compact: true }, ₹1.2L.
export function formatCurrency(amount, { compact = false } = {}) {
  return (compact ? inrCompact : inr).format(amount);
}

/** Money from the API (a string like "1180.00") → "₹1,180.00". Empty → "—". */
export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return inrExact.format(n);
}

export function formatPercent(value, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('en-IN');
}

function toDate(value) {
  if (value instanceof Date) return value;
  // Business dates (YYYY-MM-DD) are calendar days: parse them as local dates, not UTC midnight.
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISO(value) : new Date(value);
}

/** "2026-10-31" or an ISO timestamp → "31 Oct 2026". Empty → "—". */
export function formatDate(value) {
  if (!value) return '—';
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy');
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = toDate(value);
  return Number.isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy, HH:mm');
}

/** "2026-09" → "Sep 2026" (chart axes). */
export function formatMonth(value, pattern = 'MMM yy') {
  return format(parseISO(`${value}-01`), pattern);
}

export const STATUS_LABELS = {
  draft: 'Draft',
  quotation: 'Quotation',
  confirmed: 'Confirmed',
  active: 'Active',
  paused: 'Paused',
  closed: 'Closed',
  paid: 'Paid',
  cancelled: 'Cancelled',
  overdue: 'Overdue',
  partially_paid: 'Partially paid',
  scheduled: 'Scheduled',
  expired: 'Expired',
  exhausted: 'Exhausted',
  inactive: 'Inactive',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

/**
 * What an invoice is, for display: a confirmed invoice past due is "overdue"; one with part paid
 * is "partially paid". Otherwise its stored status.
 */
export function invoiceDisplayStatus(invoice) {
  if (!invoice) return 'draft';
  if (invoice.status === 'confirmed') {
    if (invoice.isOverdue) return 'overdue';
    if (Number(invoice.amountPaid) > 0) return 'partially_paid';
  }
  return invoice.status;
}

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? capitalize(String(status ?? '').replace(/_/g, ' '));
}

export function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const PERIOD_UNITS = { daily: 'day', weekly: 'week', monthly: 'month', yearly: 'year' };

/** ("monthly", 1) → "Monthly"; ("monthly", 3) → "Every 3 months". */
export function periodLabel(billingPeriod, intervalCount = 1) {
  if (!billingPeriod) return '—';
  if (Number(intervalCount) <= 1) return capitalize(billingPeriod);
  return `Every ${intervalCount} ${PERIOD_UNITS[billingPeriod]}s`;
}

/** "/ month", "/ 3 months": the suffix after a recurring price. */
export function perPeriod(billingPeriod, intervalCount = 1) {
  const unit = PERIOD_UNITS[billingPeriod];
  if (!unit) return '';
  return Number(intervalCount) <= 1 ? `/ ${unit}` : `/ ${intervalCount} ${unit}s`;
}

export const METHOD_LABELS = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  upi: 'UPI',
  card: 'Card',
  cheque: 'Cheque',
  other: 'Other',
};

export const ROLE_LABELS = { admin: 'Admin', staff: 'Staff', customer: 'Customer' };

export const PRODUCT_TYPE_LABELS = { service: 'Service', goods: 'Goods', addon: 'Add-on' };

/** "18.0000" percent → "18%"; fixed → "₹50.00". */
export function taxRateLabel(tax) {
  if (tax.type === 'percent') return `${Number(tax.rate)}%`;
  return formatMoney(tax.rate);
}

export function discountValueLabel(d) {
  return d.type === 'percent' ? `${Number(d.value)}%` : formatMoney(d.value);
}
