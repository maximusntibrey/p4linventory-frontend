import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export type NavItem = { to: string; label: string; icon: LucideIcon };

/** Bottom tabs on phones, slim icon rail on desktop. Items come from the caller (API permissions later). */
export function Nav({ items }: { items: NavItem[] }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white md:static md:inset-auto md:w-24 md:shrink-0 md:border-t-0 md:border-r"
    >
      <ul className="m-0 flex list-none justify-around p-0 md:flex-col md:justify-start md:gap-1 md:p-2">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="min-w-0 flex-1 md:flex-none">
            <NavLink
              to={to}
              end
              className={({ isActive }) =>
                `relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-xs font-semibold no-underline ${
                  isActive ? 'bg-accent-tint text-accent' : 'text-muted hover:bg-surface'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      data-active-indicator
                      className="absolute inset-x-3 top-0 h-1 rounded-full bg-accent md:inset-x-auto md:top-3 md:bottom-3 md:left-0 md:h-auto md:w-1"
                    />
                  )}
                  <Icon aria-hidden="true" size={22} />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
