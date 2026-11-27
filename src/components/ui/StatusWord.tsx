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
import { StatusBadge as Badge } from './StatusBadge';
import type { Tone } from './StatusBadge';

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

const config: Record<Status, { label: string; icon: LucideIcon; tone: Tone }> = {
  'in-stock': { label: 'In stock', icon: CheckCircle2, tone: 'success' },
  low: { label: 'Low', icon: AlertTriangle, tone: 'warning' },
  out: { label: 'Out of stock', icon: XCircle, tone: 'danger' },
  error: { label: 'Error', icon: AlertCircle, tone: 'danger' },
  active: { label: 'Active', icon: CheckCircle2, tone: 'success' },
  pending: { label: 'Pending activation', icon: Clock, tone: 'warning' },
  suspended: { label: 'Suspended', icon: PauseCircle, tone: 'warning' },
  deactivated: { label: 'Deactivated', icon: XCircle, tone: 'danger' },
  'in-transit': { label: 'In transit', icon: Truck, tone: 'warning' },
  completed: { label: 'Completed', icon: CheckCircle2, tone: 'success' },
  partial: { label: 'Partially received', icon: AlertTriangle, tone: 'warning' },
  rejected: { label: 'Rejected', icon: XCircle, tone: 'danger' },
  cancelled: { label: 'Cancelled', icon: XCircle, tone: 'danger' },
};

/** Maps the SKILLS status words onto the library StatusBadge. Always icon plus text. `label` overrides the wording. */
export function StatusWord({ status, label }: { status: Status; label?: string }) {
  const { label: text, icon, tone } = config[status];
  return (
    <Badge tone={tone} icon={icon}>
      {label ?? text}
    </Badge>
  );
}
