import { useState } from 'react';
import Box from '@mui/material/Box';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Search } from 'components/icons';
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
          <Box component="p" sx={{ m: 0, color: 'text.secondary' }}>
            No other branches.
          </Box>
        ) : (
          <Box
            component="ul"
            sx={{
              m: 0,
              display: 'flex',
              listStyle: 'none',
              flexDirection: 'column',
              gap: 0.5,
              p: 0,
            }}
          >
            {rows.map((b) => (
              <Box
                component="li"
                key={b.branch_id}
                sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}
              >
                <Box component="span" sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                  {b.branch_name}
                  {b.kind === 'warehouse' && ' (warehouse)'}
                </Box>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  {b.quantity} available
                  {b.quantity === 0 && (
                    <Box component="span" sx={{ ml: 1, color: 'text.secondary' }}>
                      (none)
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
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
        <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box component="span" sx={{ fontWeight: 600 }}>
            {r.item_name}
          </Box>
          <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            {r.sku}
          </Box>
        </Box>
      ),
    },
    {
      id: 'here',
      header: 'Available here',
      cell: (r) => (
        <span>
          <Box component="span" sx={{ color: 'text.secondary' }}>
            {r.location_name}:{' '}
          </Box>
          <Box component="span" sx={{ fontWeight: 600 }}>
            {r.available} available
          </Box>
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
          </Box>
        );
      },
    },
  ];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Find" subtitle="Where an item is in stock." />
      <Box
        component="form"
        role="search"
        sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}
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
        <Button
          type="submit"
          variant="secondary"
          icon={Search}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Search
        </Button>
      </Box>
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
    </Box>
  );
}
