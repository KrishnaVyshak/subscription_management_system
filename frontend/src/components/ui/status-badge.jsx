import { Badge } from './badge';

// One tone per lifecycle state, shared by subscriptions and invoices (see @brightloop/shared).
const STATUS_TONES = {
  draft: 'neutral',
  quotation: 'info',
  confirmed: 'brand',
  active: 'success',
  paused: 'warning',
  closed: 'neutral',
  paid: 'success',
  cancelled: 'danger',
};

export function StatusBadge({ status, className }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge tone={STATUS_TONES[status] ?? 'neutral'} dot className={className}>
      {label}
    </Badge>
  );
}
