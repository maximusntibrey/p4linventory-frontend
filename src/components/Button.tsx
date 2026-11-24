import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger';

const styles: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover border-transparent',
  secondary: 'bg-white text-ink border-control hover:bg-surface',
  danger: 'bg-white text-bad border-bad hover:bg-bad-bg',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  icon?: LucideIcon;
};

/** Children are the visible label; an icon never stands alone. */
export function Button({
  variant = 'primary',
  icon: Icon,
  children,
  className = '',
  ...rest
}: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border px-4 text-base font-semibold disabled:opacity-50 ${styles[variant]} ${className}`}
    >
      {Icon && <Icon aria-hidden="true" size={20} />}
      <span>{children}</span>
    </button>
  );
}
