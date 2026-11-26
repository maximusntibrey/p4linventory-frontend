import { Menu } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from './Button';
import { cx } from './cx';
import { Drawer } from './Drawer';

export type AppShellProps = {
  /** A <Sidebar>. Drawn as a column from md up and inside a drawer on phones. */
  sidebar: ReactNode;
  /** A <Topbar>. */
  topbar?: ReactNode;
  children: ReactNode;
  /** Showcase use: no <main> landmark, skip link or full-height layout, so it can sit inside another page. */
  embedded?: boolean;
};

/** Presentational layout. It knows nothing about the API; the caller passes the already-allowed menu. */
export function AppShell({ sidebar, topbar, children, embedded = false }: AppShellProps) {
  const { pathname } = useLocation();
  // Open for one path only, so following a link closes the drawer without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const Main = embedded ? 'div' : 'main';
  return (
    <div className={cx('flex', embedded ? 'h-full' : 'min-h-screen')}>
      {!embedded && (
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-(--z-modal) focus:bg-canvas focus:p-3"
        >
          Skip to content
        </a>
      )}
      <aside className={cx('hidden shrink-0 md:block', !embedded && 'sticky top-0 h-screen')}>
        {sidebar}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <div className="px-4 pt-2 md:hidden">
          <Button variant="secondary" icon={Menu} onClick={() => setOpenFor(pathname)}>
            Menu
          </Button>
        </div>
        <Main {...(embedded ? {} : { id: 'main', tabIndex: -1 })} className="min-w-0 flex-1 p-4">
          {children}
        </Main>
      </div>
      <Drawer open={openFor === pathname} onClose={() => setOpenFor(null)} title="Menu">
        {sidebar}
      </Drawer>
    </div>
  );
}
