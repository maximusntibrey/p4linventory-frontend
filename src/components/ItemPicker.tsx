import { useState } from 'react';
import Box from '@mui/material/Box';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'components/icons';
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
    <Box role="search" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
      <Button
        variant="secondary"
        icon={Search}
        onClick={run}
        sx={{ width: { xs: '100%', sm: 'auto' } }}
      >
        Search
      </Button>
      {q !== null && (
        <QueryGate query={results} inline>
          {(rows) =>
            rows.length === 0 ? (
              <Box component="p" sx={{ m: 0, color: 'text.secondary' }}>
                No matching items.
              </Box>
            ) : (
              <Box
                component="ul"
                sx={{
                  m: 0,
                  display: 'flex',
                  listStyle: 'none',
                  flexDirection: 'column',
                  gap: 1,
                  p: 0,
                }}
              >
                {rows.map((c) => (
                  <Box
                    component="li"
                    key={c.item_id}
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'divider',
                      p: 1.5,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Box component="p" sx={{ m: 0, overflowWrap: 'anywhere', fontWeight: 600 }}>
                        {c.name}
                      </Box>
                      <Box
                        component="p"
                        sx={{ m: 0, fontSize: '0.875rem', color: 'text.secondary' }}
                      >
                        {c.sku}
                        {c.note ? ` · ${c.note}` : ''}
                      </Box>
                    </Box>
                    {added.includes(c.item_id) ? (
                      <Box component="span" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                        Added
                      </Box>
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
                  </Box>
                ))}
              </Box>
            )
          }
        </QueryGate>
      )}
    </Box>
  );
}
