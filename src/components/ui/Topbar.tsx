import { Bell } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Avatar } from './Avatar';
import { IconButton } from './IconButton';
import { SearchInput } from './SearchInput';

export type TopbarProps = {
  /** Global search. Ctrl+K or Cmd+K focuses it from anywhere. */
  search?: { label: string; value: string; onChange: (v: string) => void };
  notifications?: { count: number; onClick: () => void };
  user?: { name: string; email: string; src?: string; onClick?: () => void };
  /** Left slot (for example the mobile menu button). */
  leading?: ReactNode;
  /** Extra controls before the bell (branch switch, filters). */
  children?: ReactNode;
};

export function Topbar({ search, notifications, user, leading, children }: TopbarProps) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
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
            label="Notifications"
            badge={notifications.count}
            onClick={notifications.onClick}
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
