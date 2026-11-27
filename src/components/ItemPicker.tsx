import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { QueryGate } from './QueryGate';
import { Button, TextField } from './ui';

export type Candidate = {
  item_id: number;
  sku: string;
  name: string;
  note?: string;
  available?: number;
};

type Props = {
  label: string;
  queryKey: readonly unknown[];
  /** Asks the API; what may be listed is the server's call. */
  find: (q: string) => Promise<Candidate[]>;
  /** Items already on the form. They show "Added" instead of an Add button. */
  added: number[];
  onAdd: (c: Candidate) => void;
};

/** Search an item, then add it as a line. Not a form, so it can sit beside one; Enter in the box searches. */
export function ItemPicker({ label, queryKey, find, added, onAdd }: Props) {
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState<string | null>(null);
  const results = useQuery({
    enabled: q !== null,
    queryKey: [...queryKey, q],
    queryFn: () => find(q ?? ''),
  });
  const run = () => setQ(draft.trim());
  return (
    <div role="search" className="flex flex-col gap-3">
      <TextField
        label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            run();
          }
        }}
      />
      <Button variant="secondary" icon={Search} onClick={run} className="w-full sm:w-auto">
        Search
      </Button>
      {q !== null && (
        <QueryGate query={results} inline>
          {(rows) =>
            rows.length === 0 ? (
              <p className="m-0 text-muted">No matching items.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {rows.map((c) => (
                  <li
                    key={c.item_id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-3"
                  >
                    <div className="min-w-0">
                      <p className="m-0 break-words font-semibold">{c.name}</p>
                      <p className="m-0 text-sm text-muted">
                        {c.sku}
                        {c.note ? ` · ${c.note}` : ''}
                      </p>
                    </div>
                    {added.includes(c.item_id) ? (
                      <span className="font-semibold text-muted">Added</span>
                    ) : (
                      <Button
                        variant="secondary"
                        icon={Plus}
                        aria-label={`Add ${c.name}`}
                        onClick={() => onAdd(c)}
                      >
                        Add
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )
          }
        </QueryGate>
      )}
    </div>
  );
}
