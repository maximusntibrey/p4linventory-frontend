import { Link } from 'react-router-dom';
import type { SxProps } from '@mui/material/styles';
import type { LinkProps } from 'react-router-dom';
import MuiButton from '@mui/material/Button';
import type { IconType } from '../icons';
import { muiLook, muiSize } from './Button';
import type { ButtonSize, ButtonVariant } from './Button';

export type LinkButtonProps = Omit<LinkProps, 'color'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconType;
  sx?: SxProps;
};

/** A real link (it navigates) that looks like a Button. Use Button for actions, LinkButton for going somewhere. */
export function LinkButton({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <MuiButton
      component={Link}
      {...muiLook(variant)}
      size={muiSize(size)}
      startIcon={Icon && <Icon size={18} />}
      {...rest}
    >
      {children}
    </MuiButton>
  );
}
