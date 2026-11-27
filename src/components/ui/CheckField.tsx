import type { InputHTMLAttributes, Ref } from 'react';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> & {
  label: string;
  type?: 'checkbox' | 'radio';
  ref?: Ref<HTMLInputElement>;
};

/** A labelled MUI checkbox or radio (44 px row). Works with react-hook-form register (name, onChange, onBlur, ref). */
export function CheckField({ label, type = 'checkbox', ref, ...rest }: Props) {
  const Control = type === 'radio' ? Radio : Checkbox;
  return (
    <FormControlLabel
      sx={{ m: 0, minHeight: 44 }}
      label={label}
      control={<Control slotProps={{ input: { ref } }} {...(rest as Record<string, unknown>)} />}
    />
  );
}
