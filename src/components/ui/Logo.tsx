import full from '../../assets/logo.svg';
import mark from '../../assets/logo-mark.svg';

export type LogoProps = {
  /** `full` = mark, wordmark and tagline; `mark` = compact laptop only (collapsed sidebar). */
  variant?: 'full' | 'mark';
  className?: string;
};

/** PLACEHOLDER artwork (real logo file not available). Swap the two SVGs in src/assets, nothing else changes. */
export function Logo({ variant = 'full', className }: LogoProps) {
  return (
    <img
      src={variant === 'mark' ? mark : full}
      alt="payless4laptop"
      className={className ?? (variant === 'mark' ? 'h-9 w-auto' : 'h-10 w-auto')}
    />
  );
}
