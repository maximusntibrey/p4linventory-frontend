import { forwardRef, useId, type InputHTMLAttributes } from 'react';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  label: string;
  hint?: string;
  /** Plain-language message, taken from the API's errors. */
  error?: string;
};

/** Labelled input in the Mantis auth-form pattern (InputLabel + OutlinedInput + FormHelperText). Works with react-hook-form's register. */
export const Field = forwardRef<HTMLInputElement, Props>(function Field(
  { label, hint, error, ...rest },
  ref,
) {
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
      <OutlinedInput
        id={id}
        fullWidth
        error={Boolean(error)}
        inputRef={ref}
        inputProps={{
          ...rest,
          'aria-describedby': describedBy,
          'aria-invalid': error ? true : undefined,
        }}
      />
      {error && (
        <FormHelperText error id={errorId} sx={{ mt: 0 }}>
          {error}
        </FormHelperText>
      )}
    </Stack>
  );
});
