import { useEffect, useRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { cx } from './cx';

export type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  description?: string;
  indeterminate?: boolean;
};

/** The whole row is the tap target (44 px). */
export function Checkbox({ label, description, indeterminate, className, ...rest }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);
  return (
    <label className={cx('flex min-h-target cursor-pointer items-center gap-3', className)}>
      <input {...rest} ref={ref} type="checkbox" className="size-5 shrink-0 accent-primary-solid" />
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
    </label>
  );
}
