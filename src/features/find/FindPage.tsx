import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search } from 'lucide-react';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { QueryGate } from '../../components/QueryGate';
import { describeError } from '../../components/ErrorSummary';
import { Forbidden } from '../../pages/Forbidden';
import {
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  StatusWord,
  TextField,
} from '../../components/ui';
import type { Column } from '../../components/ui';

type Row = components['schemas']['StockBalance'];

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

  const data = list.data;
  if (list.error instanceof ApiError && list.error.kind === 'forbidden') return <Forbidden />;
  const columns: Column<Row>[] = [
    {
      id: 'item',
      header: 'Item',
      cell: (r) => (
        <span className="flex flex-col">
          <span className="font-semibold">{r.item_name}</span>
          <span className="text-sm text-muted">{r.sku}</span>
        </span>
      ),
    },
    {
      id: 'here',
      header: 'Available here',
      cell: (r) => (
        <span>
          <span className="text-muted">{r.location_name}: </span>
          <span className="font-semibold">{r.available} available</span>
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r) => (
        <StatusWord status={r.available === 0 ? 'out' : r.low_stock ? 'low' : 'in-stock'} />
      ),
    },
    {
      id: 'others',
      header: 'Other branches',
      cell: (r) => {
        const key = `${r.location_id}-${r.item_id}`;
        const shown = open.has(key);
        return (
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              icon={MapPin}
              aria-expanded={shown}
              aria-label={`${shown ? 'Hide' : 'Show'} other branches for ${r.item_name}`}
              onClick={() => toggle(key)}
            >
              {shown ? 'Hide other branches' : 'Other branches'}
            </Button>
            {shown && <OtherBranches itemId={r.item_id} />}
          </div>
        );
      },
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Find" subtitle="Where an item is in stock." />
      <form
        role="search"
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setQ(draft.trim());
          setPage(1);
        }}
      >
        <TextField
          label="Item name or SKU"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit" variant="secondary" icon={Search} className="w-full sm:w-auto">
          Search
        </Button>
      </form>
      <DataTable
        caption="Stock found"
        columns={columns}
        rows={data ? rowsOf(data) : []}
        rowKey={(r) => `${r.location_id}-${r.item_id}`}
        state={list.isPending ? 'loading' : list.isError && !data ? 'error' : 'ready'}
        errorMessage={list.isError ? describeError(list.error).title : undefined}
        onRetry={() => void list.refetch()}
        empty={
          <EmptyState icon={Search} title="No items found" description="Try another name or SKU." />
        }
        pagination={
          data && data.count > data.page_size
            ? {
                page: data.page,
                pageCount: Math.ceil(data.count / data.page_size),
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </div>
  );
}
