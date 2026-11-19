import type { HTMLAttributes, ReactNode } from 'react';

import { cx } from './cx.ts';

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
}

/** A simple bordered surface. Tables become stacks of these on phones. */
export function Card({ title, className, children, ...rest }: CardProps) {
  return (
    <section {...rest} className={cx('rounded-lg border border-grey-200 bg-white p-4', className)}>
      {title && <h2 className="mb-2 text-lg font-semibold text-grey-900">{title}</h2>}
      {children}
    </section>
  );
}
