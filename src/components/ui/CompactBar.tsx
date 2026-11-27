import { Search } from 'lucide-react';

export type CompactBarProps = {
  /** The only control on the phone bar: a search-style field that opens the command palette. Name, user type and profile live in the palette and on Home. */
  search: { label: string; onOpen: () => void };
};

/** The single slim row at the top of the page on phones. It replaces the top bar and the menu drawer. */
export function CompactBar({ search }: CompactBarProps) {
  return (
    <header className="sticky top-0 z-(--z-nav) flex items-center gap-2 border-b border-line bg-canvas px-(--density-page) py-1">
      <button
        type="button"
        onClick={search.onOpen}
        className="flex min-h-target min-w-0 flex-1 items-center gap-2 rounded-md border border-control bg-canvas px-3 text-left text-muted"
      >
        <Search aria-hidden="true" size={18} className="shrink-0" />
        <span className="truncate">{search.label}</span>
      </button>
    </header>
  );
}
