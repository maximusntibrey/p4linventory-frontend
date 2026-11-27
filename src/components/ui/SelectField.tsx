import { useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import NativeSelect from '@mui/material/NativeSelect';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  /** Plain-language message, taken from the API errors. */
  error?: string;
};

/** Labelled native select (Mantis InputLabel + OutlinedInput + FormHelperText). Native keeps the phone picker and react-hook-form register. */
export function SelectField({ label, hint, error, children, ...rest }: Props) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  return (
    <Stack sx={{ gap: 0.5 }}>
      <InputLabel htmlFor={id}>{label}</InputLabel>
      {hint && (
        <FormHelperText id={hintId} sx={{ mt: 0 }}>
          {hint}
        </FormHelperText>
      )}
      <NativeSelect
        fullWidth
        input={<OutlinedInput error={Boolean(error)} />}
        inputProps={{
          ...rest,
          id,
          'aria-describedby': describedBy,
          'aria-invalid': error ? true : undefined,
        }}
      >
        {children}
      </NativeSelect>
      {error && (
        <FormHelperText error id={errorId} sx={{ mt: 0 }}>
          {error}
        </FormHelperText>
      )}
    </Stack>
  );
}
