import { AlertCircle } from 'lucide-react';
import { useId } from 'react';
import type { InputHTMLAttributes } from 'react';

import { cx, focusRing } from './cx.ts';

export interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  hint?: string;
  /** Inline error in plain words (from the API later). */
  error?: string;
  id?: string;
}

/** Labelled text input with hint, inline error and required marker. */
export function Field({ label, hint, error, required, id, className, ...rest }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-base font-medium text-grey-900">
        {label}
        {required && <span className="ml-1 text-grey-600">(required)</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-grey-600">
          {hint}
        </p>
      )}
      <input
        {...rest}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cx(
          'min-h-tap w-full rounded-md border bg-white px-3 py-2 text-base text-grey-900',
          'disabled:bg-grey-100 disabled:text-grey-500',
          error ? 'border-status-error' : 'border-grey-300',
          focusRing,
          className,
        )}
      />
      {error && (
        <p id={errorId} className="flex items-start gap-1 text-sm font-medium text-status-error">
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
