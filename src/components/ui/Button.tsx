import type { ButtonHTMLAttributes } from 'react';
import type { SxProps } from '@mui/material/styles';
import MuiButton from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import type { IconType } from '../icons';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/** The MUI look of each library variant: primary is the filled orange, secondary the navy outline. */
const looks = {
  primary: { variant: 'contained', color: 'primary' },
  secondary: { variant: 'outlined', color: 'secondary' },
  ghost: { variant: 'text', color: 'secondary' },
  danger: { variant: 'outlined', color: 'error' },
} as const satisfies Record<
  ButtonVariant,
  { variant: 'contained' | 'outlined' | 'text'; color: 'primary' | 'secondary' | 'error' }
>;
export const muiLook = (variant: ButtonVariant) => looks[variant];

export const muiSize = (size: ButtonSize) =>
  ({ sm: 'small', md: 'medium', lg: 'large' })[size] as 'small' | 'medium' | 'large';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon. Children stay the visible label; an icon never stands alone. */
  icon?: IconType;
  /** Disables the button, shows a spinner and sets aria-busy. The label stays. */
  loading?: boolean;
  sx?: SxProps;
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  loading = false,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <MuiButton
      type="button"
      {...muiLook(variant)}
      size={muiSize(size)}
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      startIcon={
        loading ? (
          <CircularProgress aria-hidden="true" size={18} color="inherit" />
        ) : (
          Icon && <Icon size={18} />
        )
      }
    >
      {children}
    </MuiButton>
  );
}
