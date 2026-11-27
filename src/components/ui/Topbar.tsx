import { Bell, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Avatar } from './Avatar';
import { IconButton } from './IconButton';
import { SearchInput } from './SearchInput';

export type TopbarProps = {
  /** Global search. Ctrl+K or Cmd+K focuses it from anywhere. */
  search?: { label: string; value: string; onChange: (v: string) => void };
  /** Search that opens a command palette instead of an inline box. Ctrl+K or Cmd+K opens it. */
  commandSearch?: { label: string; onOpen: () => void };
  /** `unavailable` draws the bell as a non-interactive button whose label says why (no data to show). */
  notifications?: { count: number; onClick: () => void; unavailable?: string };
  user?: { name: string; email: string; src?: string; onClick?: () => void };
  /** Left slot (for example the mobile menu button). */
  leading?: ReactNode;
  /** Extra controls before the bell (branch switch, filters). */
  children?: ReactNode;
};

export function Topbar({
  search,
  commandSearch,
  notifications,
  user,
  leading,
  children,
}: TopbarProps) {
  const input = useRef<HTMLInputElement>(null);
  const open = commandSearch?.onOpen;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) open();
        else input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  const pill = user && (
    <>
      <Avatar name={user.name} decorative />
      <span className="hidden min-w-0 flex-col text-left sm:flex">
        <span className="truncate font-semibold">{user.name}</span>
        <span className="truncate text-sm text-muted">{user.email}</span>
      </span>
    </>
  );
  return (
    <header className="sticky top-0 z-(--z-nav) flex flex-wrap items-center gap-2 border-b border-line bg-canvas px-4 py-2">
      {leading}
      {commandSearch && (
        <button
          type="button"
          onClick={commandSearch.onOpen}
          className="relative flex min-h-target min-w-0 flex-1 basis-48 items-center gap-2 rounded-md border border-control bg-canvas pr-14 pl-3 text-left text-muted"
        >
          <Search aria-hidden="true" size={18} className="shrink-0" />
          <span className="truncate">{commandSearch.label}</span>
          <kbd
            aria-hidden="true"
            className="absolute right-3 rounded-sm border border-line bg-surface px-1.5 py-0.5 text-xs font-semibold text-muted"
          >
            ⌘K
          </kbd>
        </button>
      )}
      {search && (
        <SearchInput
          ref={input}
          label={search.label}
          value={search.value}
          onValueChange={search.onChange}
          shortcutHint="⌘K"
          className="min-w-0 flex-1 basis-48"
        />
      )}
      <div className="ml-auto flex items-center gap-2">
        {children}
        {notifications && (
          <IconButton
            icon={Bell}
            label={notifications.unavailable ?? 'Notifications'}
            badge={notifications.count}
            aria-disabled={notifications.unavailable ? true : undefined}
            onClick={notifications.unavailable ? undefined : notifications.onClick}
            className={notifications.unavailable ? 'opacity-60' : undefined}
          />
        )}
        {user &&
          (user.onClick ? (
            <button
              type="button"
              onClick={user.onClick}
              aria-label={`${user.name}, ${user.email}`}
              className="flex min-h-target items-center gap-2 rounded-pill border border-line py-1 pr-3 pl-1 hover:bg-surface"
            >
              {pill}
            </button>
          ) : (
            <div className="flex min-h-target items-center gap-2 rounded-pill border border-line py-1 pr-3 pl-1">
              {pill}
            </div>
          ))}
      </div>
    </header>
  );
}
