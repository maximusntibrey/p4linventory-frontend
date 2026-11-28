import { useState } from 'react';
import Box from '@mui/material/Box';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'components/icons';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { describeError } from '../../components/ErrorSummary';
import { DataTable, EmptyState, PageHeader } from '../../components/ui';
import type { Column } from '../../components/ui';
import { Forbidden } from '../../pages/Forbidden';
import { formatAccra } from '../../lib/time';
import { ghs } from '../items/labels';

type Receipt = components['schemas']['GoodsReceipt'];

/** Read-only list of supplier receipts for users who may view but not record them (the server decides who sees which warehouse). */
export function GoodsReceiptList() {
  const [page, setPage] = useState(1);
  const warehouses = useQuery({
    queryKey: ['goods-receipts', 'warehouses'],
    queryFn: () =>
      api('get', '/api/v1/branches/', { query: { kind: 'warehouse', page_size: 100 } }),
  });
  const list = useQuery({
    placeholderData: (prev) => prev,
    queryKey: ['goods-receipts', 'list', page],
    queryFn: () => api('get', '/api/v1/goods-receipts/', { query: { page } }),
  });
  const data = list.data;
  if (list.error instanceof ApiError && list.error.kind === 'forbidden') return <Forbidden />;
  const warehouseName = (id: number) =>
    (warehouses.data ? rowsOf(warehouses.data) : []).find((w) => w.id === id)?.name ?? 'Warehouse';
  const columns: Column<Receipt>[] = [
    {
      id: 'ref',
      header: 'Reference',
      cell: (r) => (
        <Box component="span" sx={{ fontWeight: 600 }}>
          {r.reference}
        </Box>
      ),
    },
    {
      id: 'where',
      header: 'Warehouse and supplier',
      cell: (r) => `${warehouseName(r.location_id)} · ${r.supplier_name}`,
    },
    {
      id: 'lines',
      header: 'Items',
      cell: (r) => (
        <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            {formatAccra(r.received_at)} · {r.received_by}
          </Box>
          {r.lines.map((l) => (
            <span key={l.id}>
              {l.quantity} × {l.item_name}
              {l.unit_cost ? ` at ${ghs(l.unit_cost)}` : ''}
            </span>
          ))}
        </Box>
      ),
    },
  ];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Receipts" subtitle="Stock received from suppliers." />
      <DataTable
        caption="Receipts"
        columns={columns}
        rows={data ? rowsOf(data) : []}
        rowKey={(r) => String(r.id)}
        state={list.isPending ? 'loading' : list.isError && !data ? 'error' : 'ready'}
        errorMessage={list.isError ? describeError(list.error).title : undefined}
        onRetry={() => void list.refetch()}
        empty={
          <EmptyState
            icon={ClipboardCheck}
            title="No receipts yet"
            description="Nothing has been received."
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
    </Box>
  );
}
