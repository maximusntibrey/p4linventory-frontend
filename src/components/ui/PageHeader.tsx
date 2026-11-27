import { MoreHorizontal } from 'lucide-react';
import { Children, Fragment, isValidElement, useState } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { useCompact } from './useCompact';

export type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Buttons at the right. On phones two or more collapse into one "Actions" button that opens a drawer. */
  actions?: ReactNode;
};

/** Number of elements, looking through fragments (actions are usually wrapped in one). */
const countOf = (node: ReactNode): number =>
  Children.toArray(node).reduce<number>(
    (n, c) =>
      n +
      (isValidElement<{ children?: ReactNode }>(c) && c.type === Fragment
        ? countOf(c.props.children)
        : 1),
    0,
  );

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const compact = useCompact();
  const [open, setOpen] = useState(false);
  const overflow = compact && countOf(actions) > 1;
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-display">{title}</h1>
        {subtitle && <p className="m-0 text-muted">{subtitle}</p>}
      </div>
      {actions && !overflow && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      {actions && overflow && (
        <>
          <Button variant="secondary" icon={MoreHorizontal} onClick={() => setOpen(true)}>
            Actions
          </Button>
          <Drawer open={open} onClose={() => setOpen(false)} title="Actions">
            {/* Any action closes the drawer, so a dialog it opens is not stacked on it. */}
            {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
            <div className="flex flex-col gap-2 *:w-full" onClick={() => setOpen(false)}>
              {actions}
            </div>
          </Drawer>
        </>
      )}
    </header>
  );
}
