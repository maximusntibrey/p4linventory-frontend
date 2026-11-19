import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

import { cx, focusRing } from './cx.ts';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Shows a spinner and blocks clicks. The label stays, so the button keeps its name. */
  loading?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-contrast hover:bg-accent-hover border-transparent',
  secondary: 'bg-white text-grey-800 border-grey-300 hover:bg-grey-100',
  danger: 'bg-white text-status-error border-status-error hover:bg-status-error-bg',
};

export function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex min-h-tap min-w-tap items-center justify-center gap-2 rounded-md border px-4 py-2 text-base font-semibold',
        'disabled:cursor-not-allowed disabled:border-grey-200 disabled:bg-grey-100 disabled:text-grey-500',
        focusRing,
        variants[variant],
        className,
      )}
    >
      {loading && <Loader2 aria-hidden="true" className="size-5 animate-spin" />}
      {children}
      {loading && <span className="sr-only"> (working)</span>}
    </button>
  );
}
