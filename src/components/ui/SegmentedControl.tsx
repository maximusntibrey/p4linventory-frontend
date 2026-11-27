import { useId } from 'react';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { IconType } from '../icons';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  icon?: IconType;
  /** Shown under the label in the cards variant. */
  description?: string;
};

export type SegmentedControlProps<T extends string> = {
  /** Accessible name of the group. */
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentOption<T>[];
  /** segments = compact joined choices, cards = radio cards with icon and description. */
  variant?: 'segments' | 'cards';
  /** Visible label above the group (form use). Without it the group is named by label only. */
  legend?: string;
  required?: boolean;
  /** Plain-language message from the API or the form, shown under the group. */
  error?: string;
};

/** MUI RadioGroup underneath: arrow keys, one tab stop and form semantics come for free. */
export function SegmentedControl<T extends string>({
  label,
  value,
  onValueChange,
  options,
  variant = 'segments',
  legend,
  required,
  error,
}: SegmentedControlProps<T>) {
  const name = useId();
  const errorId = `${name}-error`;
  const cards = variant === 'cards';
  return (
    <FormControl error={Boolean(error)}>
      {legend && (
        <FormLabel>
          {legend}
          {required && <span> (required)</span>}
        </FormLabel>
      )}
      <RadioGroup
        row={!cards}
        name={name}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        value={value}
        onChange={(e) => onValueChange(e.target.value as T)}
        sx={{ gap: 1, flexDirection: cards ? 'column' : 'row' }}
      >
        {options.map((o) => {
          const Icon = o.icon;
          return (
            <FormControlLabel
              key={o.value}
              value={o.value}
              control={<Radio />}
              sx={{
                m: 0,
                pr: 1.5,
                minHeight: 44,
                border: '1px solid',
                borderColor: o.value === value ? 'primary.main' : 'divider',
                bgcolor: o.value === value ? 'primary.lighter' : 'background.paper',
                borderRadius: 1,
                alignItems: cards ? 'flex-start' : 'center',
              }}
              label={
                <Stack sx={{ py: cards ? 1 : 0 }}>
                  <Typography
                    variant="subtitle1"
                    component="span"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}
                  >
                    {Icon && <Icon size={16} />}
                    {o.label}
                  </Typography>
                  {cards && o.description && (
                    <Typography variant="body2" component="span" color="text.secondary">
                      {o.description}
                    </Typography>
                  )}
                </Stack>
              }
            />
          );
        })}
      </RadioGroup>
      {error && <FormHelperText id={errorId}>{error}</FormHelperText>}
    </FormControl>
  );
}
