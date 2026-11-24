import { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import type { SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement> & { label: string; error?: string };

export function Select({ label, error, className = '', children, ...rest }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      <select
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`min-h-11 rounded-lg border bg-white px-3 text-base ${error ? 'border-bad' : 'border-control'} ${className}`}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-sm font-semibold text-bad">
          <AlertCircle aria-hidden="true" size={16} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
