import { cx } from './cx';

export type AvatarProps = {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Hide from assistive tech when the name is printed next to it. */
  decorative?: boolean;
  className?: string;
};

const sizes = { sm: 'size-8 text-xs', md: 'size-10 text-sm', lg: 'size-14 text-lg' };

export const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

export function Avatar({ name, src, size = 'md', decorative = false, className }: AvatarProps) {
  const a11y = decorative ? { 'aria-hidden': true as const } : { role: 'img', 'aria-label': name };
  return (
    <span
      {...a11y}
      className={cx(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill bg-primary-soft-strong font-semibold text-primary-solid-hover',
        sizes[size],
        className,
      )}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials(name)}
    </span>
  );
}
