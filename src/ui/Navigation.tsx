import type { LucideIcon } from 'lucide-react';
import { useEffect } from 'react';

import { cx, focusRing } from './cx.ts';

export interface NavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  href: string;
  current?: boolean;
}

/** Frontend s3: at most 5 items per role. */
export const MAX_NAV_ITEMS = 5;

export interface NavigationProps {
  /** Built by the app shell from what the API allows; this component never decides who sees what. */
  items: NavItem[];
  label?: string;
}

/** Bottom tabs below the md breakpoint, slim icon rail from md up. Every icon has a visible label. */
export function Navigation({ items, label = 'Main menu' }: NavigationProps) {
  const overflow = items.length > MAX_NAV_ITEMS;
  useEffect(() => {
    if (overflow && import.meta.env.DEV) {
      console.warn(
        `Navigation: ${String(items.length)} items passed; only the first ${String(MAX_NAV_ITEMS)} are shown (Frontend s3).`,
      );
    }
  }, [overflow, items.length]);

  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-grey-200 bg-white md:inset-y-0 md:right-auto md:w-20 md:border-t-0 md:border-r"
    >
      <ul className="flex md:h-full md:flex-col md:pt-2">
        {items.slice(0, MAX_NAV_ITEMS).map(({ key, label: text, icon: Icon, href, current }) => (
          <li key={key} className="min-w-0 flex-1 md:flex-none">
            <a
              href={href}
              aria-current={current ? 'page' : undefined}
              className={cx(
                'flex min-h-tap flex-col items-center justify-center gap-1 border-t-4 px-1 py-2 text-center text-xs leading-tight md:border-t-0 md:border-l-4',
                current
                  ? 'border-accent font-semibold text-accent'
                  : 'border-transparent text-grey-700 hover:bg-grey-100',
                focusRing,
              )}
            >
              <Icon aria-hidden="true" className="size-6 shrink-0" />
              <span>{text}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
