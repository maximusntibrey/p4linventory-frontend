import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  PauseCircle,
  Truck,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Stock words, the account/branch words and the transfer words of SKILLS "Status vocabularies". */
export type Status =
  | 'in-stock'
  | 'low'
  | 'out'
  | 'error'
  | 'active'
  | 'pending'
  | 'suspended'
  | 'deactivated'
  | 'in-transit'
  | 'completed'
  | 'partial'
  | 'rejected'
  | 'cancelled';

const config: Record<Status, { label: string; icon: LucideIcon; cls: string }> = {
  'in-stock': { label: 'In stock', icon: CheckCircle2, cls: 'bg-ok-bg text-ok border-ok' },
  low: { label: 'Low', icon: AlertTriangle, cls: 'bg-warn-bg text-warn border-warn' },
  out: { label: 'Out of stock', icon: XCircle, cls: 'bg-bad-bg text-bad border-bad' },
  error: { label: 'Error', icon: AlertCircle, cls: 'bg-bad-bg text-bad border-bad' },
  active: { label: 'Active', icon: CheckCircle2, cls: 'bg-ok-bg text-ok border-ok' },
  pending: { label: 'Pending activation', icon: Clock, cls: 'bg-warn-bg text-warn border-warn' },
  suspended: { label: 'Suspended', icon: PauseCircle, cls: 'bg-warn-bg text-warn border-warn' },
  deactivated: { label: 'Deactivated', icon: XCircle, cls: 'bg-bad-bg text-bad border-bad' },
  'in-transit': { label: 'In transit', icon: Truck, cls: 'bg-warn-bg text-warn border-warn' },
  completed: { label: 'Completed', icon: CheckCircle2, cls: 'bg-ok-bg text-ok border-ok' },
  partial: {
    label: 'Partially received',
    icon: AlertTriangle,
    cls: 'bg-warn-bg text-warn border-warn',
  },
  rejected: { label: 'Rejected', icon: XCircle, cls: 'bg-bad-bg text-bad border-bad' },
  cancelled: { label: 'Cancelled', icon: XCircle, cls: 'bg-bad-bg text-bad border-bad' },
};

/** Status is always icon + text, never colour alone. `label` overrides the default wording. */
export function StatusBadge({ status, label }: { status: Status; label?: string }) {
  const { label: text, icon: Icon, cls } = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-sm font-semibold ${cls}`}
    >
      <Icon aria-hidden="true" size={16} />
      <span>{label ?? text}</span>
    </span>
  );
}
