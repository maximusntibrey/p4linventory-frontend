import type { SelectHTMLAttributes } from 'react';
import { FormField } from './FormField';
import { Select as LibrarySelect } from './Select';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  error?: string;
};

/** Labelled select built from the library's FormField and Select. */
export function SelectField({ label, hint, error, children, ...rest }: Props) {
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
