import type { ReactNode } from 'react';
import { cx } from './cx';
import { useCompact } from './useCompact';

export type AppShellProps = {
  /** A <Sidebar>. A column from md up; phones have none (navigation is the command palette). */
  sidebar: ReactNode;
  /** A <Topbar>. Drawn from md up only. */
  topbar?: ReactNode;
  /** A <CompactBar>. Drawn on phones only, in place of the sidebar and the top bar. */
  compactBar?: ReactNode;
  children: ReactNode;
  /** Showcase use: no <main> landmark, skip link or full-height layout, so it can sit inside another page. */
  embedded?: boolean;
};

/** Presentational layout. It knows nothing about the API; the caller passes the already-allowed menu. */
export function AppShell({
  sidebar,
  topbar,
  compactBar,
  children,
  embedded = false,
}: AppShellProps) {
  const compact = useCompact();
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
      {!compact && (
        <aside className={cx('shrink-0', !embedded && 'sticky top-0 h-screen')}>{sidebar}</aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        {compact ? compactBar : topbar}
        <Main
          {...(embedded ? {} : { id: 'main', tabIndex: -1 })}
          className="min-w-0 flex-1 p-(--density-page)"
        >
          {children}
        </Main>
      </div>
    </div>
  );
}
