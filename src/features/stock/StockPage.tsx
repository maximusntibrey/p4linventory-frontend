import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { api, rowsOf } from '../../api';
import type { components } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import { Field } from '../../components/Field';
import { Pager } from '../../components/Pager';
import { QueryGate } from '../../components/QueryGate';
import { Select } from '../../components/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { Button, Card } from '../../components/ui';

type Row = components['schemas']['StockBalance'];

const figures: { key: keyof Row; label: string }[] = [
  { key: 'on_hand', label: 'On hand' },
  { key: 'available', label: 'Available' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'quarantined', label: 'Quarantined' },
];

/**
 * Stock by location. The API decides which locations this user may see; the location filter is
 * offered only when /me lets the user view branches. The "Low" flag is the server's `low_stock`.
 */
export function StockPage() {
  const canPickLocation = useCurrentMe().permissions.includes('branches.view');
  const [filters, setFilters] = useState({ q: '', location: '' });
  const [draft, setDraft] = useState(filters);
  const [page, setPage] = useState(1);
  const locations = useQuery({
    enabled: canPickLocation,
    queryKey: ['stock', 'locations'],
    queryFn: () => api('get', '/api/v1/branches/', { query: { is_active: true, page_size: 100 } }),
  });
  const list = useQuery({
    placeholderData: (prev) => prev,
    queryKey: ['stock', 'list', filters, page],
    queryFn: () =>
      api('get', '/api/v1/stock/', {
        query: {
          page,
          q: filters.q || undefined,
          location_id: filters.location ? Number(filters.location) : undefined,
        },
      }),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-display">Stock</h1>
      <form
        role="search"
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(draft);
          setPage(1);
        }}
      >
        <div className={canPickLocation ? '' : 'sm:col-span-2'}>
          <Field
            label="Search by item name or SKU"
            value={draft.q}
            onChange={(e) => setDraft({ ...draft, q: e.target.value })}
          />
        </div>
        {canPickLocation && (
          <Select
            label="Location"
            value={draft.location}
            onChange={(e) => setDraft({ ...draft, location: e.target.value })}
          >
            <option value="">All locations</option>
            {(locations.data ? rowsOf(locations.data) : []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        )}
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary" icon={Search} className="w-full sm:w-auto">
            Search
          </Button>
        </div>
      </form>
      <QueryGate query={list}>
        {(data) => {
          const rows = rowsOf(data);
          const byLocation = new Map<number, Row[]>();
          for (const r of rows) {
            byLocation.set(r.location_id, [...(byLocation.get(r.location_id) ?? []), r]);
          }
          return (
            <>
              {rows.length === 0 && <p className="m-0 text-muted">No stock matches.</p>}
              {[...byLocation].map(([id, group]) => (
                <section key={id} aria-labelledby={`loc-${group[0].location_id}`}>
                  <h2 id={`loc-${group[0].location_id}`} className="mb-2 text-3xl">
                    {group[0].location_name}
                  </h2>
                  <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
                    {group.map((r) => (
                      <li key={`${r.location_id}-${r.item_id}`}>
                        <Card className="flex h-full flex-col gap-2">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <p className="m-0 min-w-0 break-words text-lg font-semibold">
                              {r.item_name}
                            </p>
                            <StatusBadge
                              status={r.available === 0 ? 'out' : r.low_stock ? 'low' : 'in-stock'}
                            />
                          </div>
                          <p className="m-0 text-sm text-muted">{r.sku}</p>
                          <dl className="m-0 grid grid-cols-2 gap-x-3 gap-y-1">
                            {figures.map((f) => (
                              <div key={f.key} className="flex justify-between gap-2">
                                <dt className="text-sm text-muted">{f.label}</dt>
                                <dd className="m-0 font-semibold">{r[f.key]}</dd>
                              </div>
                            ))}
                          </dl>
                          {r.reorder_level !== null && (
                            <p className="m-0 text-sm text-muted">
                              Reorder level: {r.reorder_level}
                            </p>
                          )}
                        </Card>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <Pager page={data} onPage={setPage} />
            </>
          );
        }}
      </QueryGate>
    </div>
  );
}
