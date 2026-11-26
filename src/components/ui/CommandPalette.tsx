import { CornerDownLeft } from 'lucide-react';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Modal } from './Modal';
import { SearchInput } from './SearchInput';

export type CommandItem = {
  id: string;
  label: string;
  /** Muted text after the label, for example the group. */
  hint?: string;
  icon?: LucideIcon;
};

export type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  /** Title and accessible name of the search box. */
  label: string;
  /** Only what the caller allows the user to open. The palette never decides that. */
  items: CommandItem[];
  onSelect: (item: CommandItem) => void;
};

/** Search-and-jump dialog. Typing filters the items; Enter opens the first match; Tab and Shift+Tab walk the rest. */
export function CommandPalette({ open, onClose, label, items, onSelect }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = items.filter((i) => !q || `${i.label} ${i.hint ?? ''}`.toLowerCase().includes(q));
  const pick = (item: CommandItem) => {
    setQuery('');
    onSelect(item);
  };
  return (
    <Modal open={open} onClose={onClose} title={label}>
      <div className="flex flex-col gap-3">
        <SearchInput
          data-autofocus
          label={label}
          value={query}
          onValueChange={setQuery}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && shown[0]) pick(shown[0]);
          }}
        />
        {shown.length === 0 ? (
          <p role="status" className="m-0 text-muted">
            Nothing matches “{query}”.
          </p>
        ) : (
          <ul aria-label="Results" className="m-0 flex list-none flex-col gap-1 p-0">
            {shown.map((item, i) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => pick(item)}
                    className="flex min-h-target w-full items-center gap-3 rounded-md px-3 text-left font-semibold hover:bg-surface"
                  >
                    {Icon && <Icon aria-hidden="true" size={20} className="shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.hint && (
                      <span className="text-sm font-normal text-muted">{item.hint}</span>
                    )}
                    {i === 0 && q && (
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
        )}
      </div>
    </Modal>
  );
}
