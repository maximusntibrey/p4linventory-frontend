import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { LinkProps } from 'react-router-dom';
import { buttonClass } from './Button';
import type { ButtonSize, ButtonVariant } from './Button';

export type LinkButtonProps = LinkProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
};

/** A real link (it navigates) that looks like a Button. Use Button for actions, LinkButton for going somewhere. */
export function LinkButton({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  className,
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <Link {...rest} className={buttonClass(variant, size, className)}>
      {Icon && <Icon aria-hidden="true" size={20} />}
      <span>{children}</span>
    </Link>
  );
}
