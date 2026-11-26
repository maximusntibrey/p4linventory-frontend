import { AlertCircle } from 'lucide-react';
import { useId } from 'react';
import type { ReactNode } from 'react';

export type FieldControlProps = {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': true | undefined;
};

export type FormFieldProps = {
  label: string;
  help?: string;
  /** Plain-language message, taken from the API's errors. */
  error?: string;
  required?: boolean;
  /** Render the control and spread the given props onto it so label, help and error are wired. */
  children: (control: FieldControlProps) => ReactNode;
};

export function FormField({ label, help, error, required, children }: FormFieldProps) {
  const id = useId();
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const describedBy = [help && helpId, error && errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
        {required && <span className="text-bad"> (required)</span>}
      </label>
      {help && (
        <p id={helpId} className="m-0 text-sm text-muted">
          {help}
        </p>
      )}
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {error && (
        <p id={errorId} className="m-0 flex items-center gap-1 text-sm font-semibold text-bad">
          <AlertCircle aria-hidden="true" size={16} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
