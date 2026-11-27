import { ArrowDownRight, ArrowUpRight, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from './cx';

export type Delta = {
  /** Text such as "+4.2%". The arrow and the word make direction readable without colour. */
  value: string;
  direction: 'up' | 'down';
  /** Is this direction good? Decides green or red; a fall in "returns" is good. Default: up is good. */
  good?: boolean;
};

export type StatCardProps = {
  label: string;
  value: string | number;
  /** Explains the metric. Shown on hover and keyboard focus of the info button. */
  info?: string;
  delta?: Delta;
};

export function DeltaChip({ delta }: { delta: Delta }) {
  const good = delta.good ?? delta.direction === 'up';
  const Icon = delta.direction === 'up' ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cx(
        'inline-flex items-center gap-0.5 rounded-pill px-2 py-0.5 text-xs font-semibold',
        good ? 'bg-ok-bg text-ok' : 'bg-bad-bg text-bad',
      )}
    >
      <Icon aria-hidden="true" size={14} />
      <span className="sr-only">{delta.direction === 'up' ? 'Up ' : 'Down '}</span>
      <span>{delta.value}</span>
    </span>
  );
}

/** One cell of a StatsStrip: label, optional info icon, big number, small delta chip. */
export function StatCard({ label, value, info, delta }: StatCardProps) {
  return (
    <div className="flex flex-col gap-1 bg-canvas p-4">
      <dt className="flex items-center gap-1 text-sm font-semibold text-muted">
        <span>{label}</span>
        {info && (
          <button
            type="button"
            aria-label={`About ${label}: ${info}`}
            title={info}
            className="group relative inline-flex min-h-target min-w-target items-center justify-center rounded-pill text-muted"
          >
            <Info aria-hidden="true" size={16} />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-full left-0 z-(--z-overlay) hidden w-48 rounded-sm bg-ink p-2 text-xs font-normal text-on-primary group-hover:block group-focus-visible:block"
            >
              {info}
            </span>
          </button>
        )}
      </dt>
      <dd className="m-0 flex flex-wrap items-baseline gap-2">
        <span className="font-display text-display">{value}</span>
        {delta && <DeltaChip delta={delta} />}
      </dd>
    </div>
  );
}

const stripColumns = {
  2: 'grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-4',
} as const;

/** One bordered container split into cells. `columns` is the cell count on wide screens, so no empty cell shows (default 4: 2 per row on phones). */
export function StatsStrip({
  label,
  children,
  columns = 4,
}: {
  label: string;
  children: ReactNode;
  columns?: keyof typeof stripColumns;
}) {
  return (
    <dl
      aria-label={label}
      className={cx(
        'm-0 grid gap-px overflow-hidden rounded-lg border border-line bg-line',
        stripColumns[columns],
      )}
    >
      {children}
    </dl>
  );
}
