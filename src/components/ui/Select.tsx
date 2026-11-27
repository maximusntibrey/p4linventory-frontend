import type { SelectHTMLAttributes } from 'react';
import { controlClass } from './Input';
import { cx } from './cx';

/** Native select (best keyboard and phone behaviour). Put it inside FormField for label, help and error. */
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...rest}
      className={cx(
        controlClass,
        rest['aria-invalid'] ? 'border-bad' : 'border-control',
        className,
      )}
    >
      {children}
    </select>
  );
}
