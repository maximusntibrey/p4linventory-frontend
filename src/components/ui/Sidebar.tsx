import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cx } from './cx';
import { IconButton } from './IconButton';

export type SidebarItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Count badge (for example open transfers). */
  badge?: number;
};

export type SidebarSection = {
  /** Small muted uppercase heading; omit for an unlabeled group. */
  label?: string;
  items: SidebarItem[];
};

export type SidebarProps = {
  sections: SidebarSection[];
  /** Workspace or organisation header. A function receives the collapsed state. */
  header?: ReactNode | ((collapsed: boolean) => ReactNode);
  /** Pinned to the bottom (user, help, log out). */
  footer?: ReactNode | ((collapsed: boolean) => ReactNode);
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Hide the collapse control (the mobile drawer copy). */
  collapsible?: boolean;
  label?: string;
};

const slot = (s: SidebarProps['header'], collapsed: boolean) =>
  typeof s === 'function' ? s(collapsed) : s;

/**
 * Grouped navigation. The active item is a soft tinted pill (aria-current="page" from the router).
 * Collapsed mode keeps each label for assistive tech and as a tooltip; the owner picks the density.
 */
export function Sidebar({
  sections,
  header,
  footer,
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  collapsible = true,
  label = 'Main',
}: SidebarProps) {
  const [inner, setInner] = useState(defaultCollapsed);
  const collapsed = collapsedProp ?? inner;
  const toggle = () => {
    setInner(!collapsed);
    onCollapsedChange?.(!collapsed);
  };
  return (
    <div
      className={cx(
        'flex h-full flex-col gap-4 border-r border-line bg-canvas p-3',
        collapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className={cx('flex items-center gap-2', collapsed ? 'flex-col' : 'justify-between')}>
        <div className="min-w-0 flex-1">{slot(header, collapsed)}</div>
        {collapsible && (
          <IconButton
            shape="square"
            icon={collapsed ? PanelLeftOpen : PanelLeftClose}
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={toggle}
          />
        )}
      </div>
      <nav aria-label={label} className="flex-1 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={section.label ?? i} className="mb-4">
            {section.label && !collapsed && (
              <p className="m-0 px-3 pb-1 text-xs font-semibold tracking-wider text-muted uppercase">
                {section.label}
              </p>
            )}
            {section.label && collapsed && <span className="sr-only">{section.label}</span>}
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {section.items.map(({ to, label: text, icon: Icon, badge }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end
                    title={collapsed ? text : undefined}
                    className={({ isActive }) =>
                      cx(
                        'flex min-h-target items-center gap-3 rounded-lg px-3 font-semibold no-underline',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-primary-soft-strong text-primary-solid-hover'
                          : 'text-ink hover:bg-surface',
                      )
                    }
                  >
                    <Icon aria-hidden="true" size={20} className="shrink-0" />
                    <span className={cx('min-w-0 flex-1 truncate', collapsed && 'sr-only')}>
                      {text}
                    </span>
                    {badge !== undefined && (
                      <span
                        className={cx(
                          'rounded-pill bg-primary-solid px-2 text-xs font-semibold text-on-primary',
                          collapsed && 'sr-only',
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      {footer && <div className="border-t border-line pt-3">{slot(footer, collapsed)}</div>}
    </div>
  );
}
