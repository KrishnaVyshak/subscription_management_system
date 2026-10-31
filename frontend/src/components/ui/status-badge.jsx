import { invoiceDisplayStatus, statusLabel } from '@/lib/format';
import { Badge } from './badge';

// One tone per state, shared by subscriptions, invoices, discounts and billing runs everywhere
// (lists, details, portal). The label always travels with the colour.
const STATUS_TONES = {
  // Subscriptions
  draft: 'neutral',
  quotation: 'info',
  confirmed: 'ink',
  active: 'success',
  paused: 'warning',
  closed: 'outline',
  // Invoices (plus the derived overdue / partially paid)
  paid: 'success',
  cancelled: 'danger',
  overdue: 'danger',
  partially_paid: 'warning',
  // Discounts
  scheduled: 'info',
  expired: 'outline',
  exhausted: 'neutral',
  inactive: 'neutral',
  // Billing runs
  running: 'info',
  completed: 'success',
  failed: 'danger',
};

export function StatusBadge({ status, className }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? 'neutral'} dot className={className}>
      {statusLabel(status)}
    </Badge>
  );
}

export function InvoiceStatusBadge({ invoice, className }) {
  return <StatusBadge status={invoiceDisplayStatus(invoice)} className={className} />;
}
