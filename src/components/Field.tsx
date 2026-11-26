import type { InputHTMLAttributes } from 'react';
import { FormField, Input } from './ui';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  /** Plain-language message, taken from the API's errors. */
  error?: string;
};

/** Labelled text input built from the library's FormField and Input; keeps the form-library friendly props. */
export function Field({ label, hint, error, ...rest }: Props) {
  return (
    <FormField label={label} help={hint} error={error}>
      {(c) => <Input {...rest} {...c} />}
    </FormField>
  );
}
