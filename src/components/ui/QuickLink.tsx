import type { LucideIcon } from 'lucide-react';
import { Children } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from './cx';

type Common = {
  icon: LucideIcon;
  label: string;
  /** Optional real number from the API. Shown as a badge; the `countLabel` words make it readable (never a bare number). */
  count?: number;
  countLabel?: string;
  /** A second line, for example the branch name. */
  detail?: string;
};

export type QuickLinkProps = Common &
  ({ to: string; onClick?: never } | { onClick: () => void; to?: never });

const tile =
  'relative flex min-h-14 items-center gap-2 rounded-xl border border-line bg-canvas p-3 text-left font-semibold text-ink no-underline shadow-card hover:bg-surface';

/** A tile that opens a screen (`to`) or does something (`onClick`): icon, label, optional count badge. Always one 44 px+ target. */
export function QuickLink({
  icon: Icon,
  label,
  count,
  countLabel,
  detail,
  ...target
}: QuickLinkProps) {
  const body = (
    <>
      <Icon aria-hidden="true" size={22} className="shrink-0 text-primary-solid" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate">{label}</span>
        {detail && <span className="truncate text-sm font-normal text-muted">{detail}</span>}
      </span>
      {count !== undefined && count > 0 && (
        <span className="shrink-0 rounded-pill bg-primary-solid px-2 py-0.5 text-xs font-semibold text-on-primary">
          {count}
          {countLabel && <span className="sr-only"> {countLabel}</span>}
        </span>
      )}
    </>
  );
  return target.to ? (
    <Link to={target.to} className={tile}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={target.onClick} className={cx(tile, 'w-full')}>
      {body}
    </button>
  );
}

/** Two tiles per row on phones, three from sm. Children are <QuickLink>s. */
export function QuickLinkGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <ul aria-label={label} className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3">
      {Children.toArray(children).map((c, i) => (
        <li key={i}>{c}</li>
      ))}
    </ul>
  );
}
