import type { InputHTMLAttributes } from 'react';
import { cx } from './cx';

export const controlClass =
  'min-h-target w-full rounded-md border bg-canvas px-3 text-base text-ink placeholder:text-muted disabled:opacity-50';

/** Bare text input. Put it inside FormField for a label, help and error; the aria props come from there. */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cx(
        controlClass,
        rest['aria-invalid'] ? 'border-bad' : 'border-control',
        className,
      )}
    />
  );
}
