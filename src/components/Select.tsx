import type { SelectHTMLAttributes } from 'react';
import { FormField, Select as LibrarySelect } from './ui';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
};

/** Labelled select built from the library's FormField and Select. */
export function Select({ label, hint, error, children, ...rest }: Props) {
  return (
    <FormField label={label} help={hint} error={error}>
      {(c) => (
        <LibrarySelect {...rest} {...c}>
          {children}
        </LibrarySelect>
      )}
    </FormField>
  );
}
