import { Badge } from './badge';

// One tone per lifecycle state, shared by subscriptions and invoices (see @brightloop/shared).
const STATUS_TONES = {
  draft: 'neutral',
  quotation: 'info',
  confirmed: 'ink',
  active: 'success',
  paused: 'warning',
  closed: 'outline',
  paid: 'success',
  cancelled: 'danger',
};

export function StatusBadge({ status, className }) {
  return (
    <Badge tone={STATUS_TONES[status] ?? 'neutral'} dot className={className}>
      {status}
    </Badge>
  );
}
