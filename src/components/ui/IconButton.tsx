import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  icon: LucideIcon;
  /** Required. Becomes the accessible name and a visible tooltip on hover and keyboard focus. */
  label: string;
  /** Show the label as text next to the icon instead of a tooltip. */
  showLabel?: boolean;
  /** Small count badge (notifications). Read out as part of the name. */
  badge?: number;
  shape?: 'round' | 'square';
};

export function IconButton({
  icon: Icon,
  label,
  showLabel = false,
  badge,
  shape = 'round',
  className,
  ...rest
}: IconButtonProps) {
  const name = badge ? `${label}, ${badge} new` : label;
  return (
    <button
      type="button"
      {...rest}
      aria-label={name}
      className={cx(
        'group relative inline-flex min-h-target min-w-target items-center justify-center gap-2 border border-line bg-canvas text-ink hover:bg-surface disabled:opacity-50',
        shape === 'round' ? 'rounded-pill' : 'rounded-md',
        showLabel && 'px-3 font-semibold',
        className,
      )}
    >
      <Icon aria-hidden="true" size={20} />
      {showLabel ? (
        <span aria-hidden="true">{label}</span>
      ) : (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-full right-0 z-(--z-overlay) mt-1 hidden rounded-sm bg-ink px-2 py-1 text-xs font-semibold whitespace-nowrap text-on-primary group-hover:block group-focus-visible:block"
        >
          {label}
        </span>
      )}
      {badge ? (
        <span
          aria-hidden="true"
          className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-pill bg-primary-solid px-1 text-xs font-semibold text-on-primary"
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
