import { CornerDownLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cx } from './cx';
import { Modal } from './Modal';
import { SearchInput } from './SearchInput';

export type CommandItem = {
  id: string;
  label: string;
  /** Muted text after the label, for example the group. */
  hint?: string;
  icon?: LucideIcon;
  /** Heading the item is listed under. Items without one are listed first, unheaded. */
  group?: string;
  /** Why the item cannot be used right now. It is listed, says so, and does nothing. */
  disabled?: string;
};

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  /** Title and accessible name of the search box. */
  label: string;
  /** Only what the caller allows the user to open. The palette never decides that. */
  items: CommandItem[];
  onSelect: (item: CommandItem) => void;
  /** A "Profile" section above the groups (hidden while a search is typed). Phones keep the whole profile here. */
  profile?: ReactNode;
  /** Start with the Profile section open instead of folded. */
  profileOpen?: boolean;
};

/** Ctrl+K or Cmd+K calls `onOpen` from anywhere. */
export function useCommandShortcut(onOpen: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onOpen]);
}

/**
 * Search-and-jump navigator, a full-screen sheet on phones. Items sit under group headings; typing filters
 * them; Enter opens the first usable match; Tab and Shift+Tab walk the rest. Selecting closes it (the caller sets `open`).
 */
export function CommandPalette({
  open,
  onClose,
  label,
  items,
  onSelect,
  profile,
  profileOpen,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = items.filter((i) => !q || `${i.label} ${i.hint ?? ''}`.toLowerCase().includes(q));
  const first = shown.find((i) => !i.disabled);
  const groups = [...new Set(shown.map((i) => i.group ?? ''))];
  const pick = (item: CommandItem) => {
    if (item.disabled) return;
    setQuery('');
    onSelect(item);
  };
  return (
    <Modal open={open} onClose={onClose} title={label} fullOnPhone>
      <div className="flex flex-col gap-3">
        <SearchInput
          data-autofocus
          label={label}
          value={query}
          onValueChange={setQuery}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && first) pick(first);
          }}
        />
        {profile && !q && (
          <details open={profileOpen} className="rounded-lg border border-line">
            <summary className="flex min-h-target cursor-pointer items-center px-3 font-semibold">
              Profile
            </summary>
            <div className="p-3">{profile}</div>
          </details>
        )}
        {shown.length === 0 ? (
          <p role="status" className="m-0 text-muted">
            Nothing matches “{query}”.
          </p>
        ) : (
          groups.map((g) => (
            <section key={g} aria-label={g || 'Results'} className="flex flex-col gap-1">
              {g && <h3 className="m-0 px-3 text-sm font-semibold text-muted uppercase">{g}</h3>}
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {shown
                  .filter((i) => (i.group ?? '') === g)
                  .map((item) => {
                    const Icon = item.icon;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-disabled={item.disabled ? true : undefined}
                          onClick={() => pick(item)}
                          className={cx(
                            'flex min-h-target w-full items-center gap-3 rounded-md px-3 text-left font-semibold',
                            item.disabled ? 'cursor-not-allowed text-muted' : 'hover:bg-surface',
                          )}
                        >
                          {Icon && <Icon aria-hidden="true" size={20} className="shrink-0" />}
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {(item.disabled ?? item.hint) && (
                            <span className="text-sm font-normal text-muted">
                              {item.disabled ?? item.hint}
                            </span>
                          )}
                          {item === first && q && (
                            <CornerDownLeft
                              aria-hidden="true"
                              size={16}
                              className="shrink-0 text-muted"
                            />
                          )}
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </section>
          ))
        )}
      </div>
    </Modal>
  );
}
