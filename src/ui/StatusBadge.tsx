import { AlertCircle, CheckCircle2, MinusCircle, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cx } from './cx.ts';

export type Status = 'ok' | 'low' | 'out' | 'error';

const styles: Record<Status, { icon: LucideIcon; classes: string }> = {
  ok: { icon: CheckCircle2, classes: 'bg-status-ok-bg text-status-ok border-status-ok' },
  low: { icon: TriangleAlert, classes: 'bg-status-low-bg text-status-low border-status-low' },
  out: { icon: MinusCircle, classes: 'bg-status-out-bg text-status-out border-status-out' },
  error: { icon: AlertCircle, classes: 'bg-status-error-bg text-status-error border-status-error' },
};

export interface StatusBadgeProps {
  status: Status;
  /** The visible words, for example "In stock". Always shown: colour is never the only signal. */
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const { icon: Icon, classes } = styles[status];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm font-semibold',
        classes,
      )}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {label}
    </span>
  );
}
