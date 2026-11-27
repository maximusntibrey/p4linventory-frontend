import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Boxes, Search } from 'lucide-react';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import { describeError } from '../../components/ErrorSummary';
import { Forbidden } from '../../pages/Forbidden';
import {
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  SelectField,
  StatusWord,
  Toolbar,
} from '../../components/ui';
import type { Column } from '../../components/ui';

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

  const apply = () => {
    setFilters(draft);
    setPage(1);
  };
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
    { id: 'location', header: 'Location', cell: (r) => r.location_name },
    ...figures.map((f) => ({
      id: String(f.key),
      header: f.label,
      align: 'right' as const,
      cell: (r: Row) => r[f.key],
    })),
    {
      id: 'reorder',
      header: 'Reorder level',
      align: 'right',
      cell: (r) => (r.reorder_level === null ? '' : r.reorder_level),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (r) => (
        <StatusWord status={r.available === 0 ? 'out' : r.low_stock ? 'low' : 'in-stock'} />
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Stock" subtitle="By item and location." />
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          apply();
        }}
      >
        <Toolbar
          search={{
            label: 'Search by item name or SKU',
            value: draft.q,
            onChange: (q) => setDraft({ ...draft, q }),
          }}
        >
          {canPickLocation && (
            <div className="w-full sm:w-48">
              <SelectField
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
              </SelectField>
            </div>
          )}
          <Button type="button" variant="secondary" icon={Search} onClick={apply}>
            Search
          </Button>
        </Toolbar>
      </form>
      <DataTable
        caption="Stock"
        columns={columns}
        rows={data ? rowsOf(data) : []}
        rowKey={(r) => `${r.location_id}-${r.item_id}`}
        state={list.isPending ? 'loading' : list.isError && !data ? 'error' : 'ready'}
        errorMessage={list.isError ? describeError(list.error).title : undefined}
        onRetry={() => void list.refetch()}
        empty={
          <EmptyState
            icon={Boxes}
            title="No stock matches"
            description="Change the search or the location."
          />
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
