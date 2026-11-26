import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search } from 'lucide-react';
import { api, rowsOf } from '../../api';
import { Field } from '../../components/Field';
import { Pager } from '../../components/Pager';
import { QueryGate } from '../../components/QueryGate';
import { StatusBadge } from '../../components/StatusBadge';
import { Button, Card } from '../../components/ui';

/** Other branches for one item: branch name and available quantity only (the API sends nothing more). */
function OtherBranches({ itemId }: { itemId: number }) {
  const q = useQuery({
    queryKey: ['find', 'availability', itemId],
    queryFn: () => api('get', '/api/v1/items/{id}/branch-availability/', { path: { id: itemId } }),
  });
  return (
    <QueryGate query={q} inline>
      {(rows) =>
        rows.length === 0 ? (
          <p className="m-0 text-muted">No other branches.</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {rows.map((b) => (
              <li key={b.branch_id} className="flex justify-between gap-2">
                <span className="min-w-0 break-words">{b.branch_name}</span>
                <span className="font-semibold">
                  {b.quantity} available
                  {b.quantity === 0 && <span className="ml-2 text-muted">(none)</span>}
                </span>
              </li>
            ))}
          </ul>
        )
      }
    </QueryGate>
  );
}

/** Find an item: stock the API shows for me, and on request the other branches' available quantity. No price, no cost. */
export function FindPage() {
  const [draft, setDraft] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const list = useQuery({
    placeholderData: (prev) => prev,
    queryKey: ['find', 'stock', q, page],
    queryFn: () => api('get', '/api/v1/stock/', { query: { page, q: q || undefined } }),
  });
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-4xl text-ink">Find</h1>
      <form
        role="search"
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(draft.trim());
          setPage(1);
        }}
      >
        <Field label="Item name or SKU" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" variant="secondary" icon={Search} className="w-full sm:w-auto">
          Search
        </Button>
      </form>
      <QueryGate query={list}>
        {(data) => {
          const rows = rowsOf(data);
          return (
            <>
              {rows.length === 0 && <p className="m-0 text-muted">No items found.</p>}
              <ul className="m-0 grid list-none gap-3 p-0">
                {rows.map((r) => {
                  const key = `${r.location_id}-${r.item_id}`;
                  const shown = open.has(key);
                  return (
                    <li key={key}>
                      <Card className="flex flex-col gap-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="m-0 min-w-0 break-words text-lg font-semibold">
                            {r.item_name}
                          </p>
                          <StatusBadge
                            status={r.available === 0 ? 'out' : r.low_stock ? 'low' : 'in-stock'}
                          />
                        </div>
                        <p className="m-0 text-sm text-muted">{r.sku}</p>
                        <p className="m-0">
                          <span className="text-muted">{r.location_name}: </span>
                          <span className="font-semibold">{r.available} available</span>
                        </p>
                        <Button
                          variant="secondary"
                          icon={MapPin}
                          aria-expanded={shown}
                          aria-label={`${shown ? 'Hide' : 'Show'} other branches for ${r.item_name}`}
                          onClick={() => toggle(key)}
                          className="w-full sm:w-auto"
                        >
                          {shown ? 'Hide other branches' : 'Other branches'}
                        </Button>
                        {shown && <OtherBranches itemId={r.item_id} />}
                      </Card>
                    </li>
                  );
                })}
              </ul>
              <Pager page={data} onPage={setPage} />
            </>
          );
        }}
      </QueryGate>
    </div>
  );
}
