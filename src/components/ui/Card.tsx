import type { HTMLAttributes } from 'react';
import { cx } from './cx';

/** Bordered surface that groups related content. Add layout classes (flex, gap) from the caller. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cx(
        'rounded-xl border border-line bg-canvas p-(--density-card) shadow-card',
        className,
      )}
    />
  );
}
