import { Menu } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from './Button';
import { Drawer } from './Drawer';

export type AppShellProps = {
  /** A <Sidebar>. Drawn as a column from md up and inside a drawer on phones. */
  sidebar: ReactNode;
  /** A <Topbar>. */
  topbar?: ReactNode;
  children: ReactNode;
};

/** Presentational layout. It knows nothing about the API; the caller passes the already-allowed menu. */
export function AppShell({ sidebar, topbar, children }: AppShellProps) {
  const { pathname } = useLocation();
  // Open for one path only, so following a link closes the drawer without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  return (
    <div className="flex min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-(--z-modal) focus:bg-canvas focus:p-3"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-screen shrink-0 md:block">{sidebar}</aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {topbar}
        <div className="px-4 pt-2 md:hidden">
          <Button variant="secondary" icon={Menu} onClick={() => setOpenFor(pathname)}>
            Menu
          </Button>
        </div>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-4">
          {children}
        </main>
      </div>
      <Drawer open={openFor === pathname} onClose={() => setOpenFor(null)} title="Menu">
        {sidebar}
      </Drawer>
    </div>
  );
}
