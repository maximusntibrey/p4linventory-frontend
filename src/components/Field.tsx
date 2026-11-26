import { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  /** Plain-language message, taken from the API's errors. */
  error?: string;
};

export function Field({ label, hint, error, className = '', ...rest }: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      )}
      <input
        {...rest}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-11 rounded-lg border bg-white px-3 text-base ${error ? 'border-bad' : 'border-control'} ${className}`}
      />
      {error && (
        <p id={errorId} className="flex items-center gap-1 text-sm font-semibold text-bad">
          <AlertCircle aria-hidden="true" size={16} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
