import { Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-solid text-on-primary hover:bg-primary-solid-hover border-transparent',
  secondary: 'bg-canvas text-ink border-control hover:bg-surface',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-surface',
  danger: 'bg-canvas text-bad border-bad hover:bg-bad-bg',
};
// min-h-target = 44 px, the token (never min-h-11: that scales with the phone density). Every size keeps it on touch; sm only tightens padding and type.
const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-target px-3 text-sm',
  md: 'min-h-target px-4 text-base',
  lg: 'min-h-[3rem] px-6 text-lg',
};

/** The look of a button, so a link that navigates can wear it (LinkButton). */
export const buttonClass = (
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
) =>
  cx(
    'inline-flex min-w-target items-center justify-center gap-2 rounded-md border font-semibold no-underline disabled:opacity-50',
    variants[variant],
    sizes[size],
    extra,
  );

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon. Children stay the visible label; an icon never stands alone. */
  icon?: LucideIcon;
  /** Disables the button, shows a spinner and sets aria-busy. The label stays. */
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled,
  children,
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
    >
      {loading ? (
        <Loader2 aria-hidden="true" size={20} className="animate-spin" />
      ) : (
        Icon && <Icon aria-hidden="true" size={20} />
      )}
      <span>{children}</span>
    </button>
  );
}
