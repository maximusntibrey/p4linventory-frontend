import { useState } from 'react';
import Box from '@mui/material/Box';
import { useQuery } from '@tanstack/react-query';
import { Plus, Truck } from 'components/icons';
import { api, ApiError, rowsOf } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import { describeError } from '../../components/ErrorSummary';
import { Forbidden } from '../../pages/Forbidden';
import { formatAccra } from '../../lib/time';
import { dispatchStatusBadge, dispatchStatuses, unitsSent } from './labels';
import type { components } from '../../api';
import {
  DataTable,
  EmptyState,
  LinkButton,
  PageHeader,
  SelectField,
  StatusWord,
  Toolbar,
} from '../../components/ui';
import type { Column } from '../../components/ui';

type Dispatch = components['schemas']['Dispatch'];
type Status = components['schemas']['DispatchStatus'];

/** Every dispatch with its status. Filter by status and branch; "In transit" plus a branch is what is waiting there. */
export function DispatchesPage() {
  const canCreate = useCurrentMe().permissions.includes('dispatches.create');
  const [status, setStatus] = useState('');
  const [branch, setBranch] = useState('');
  const [page, setPage] = useState(1);
  const branches = useQuery({
    queryKey: ['dispatches', 'branches'],
    queryFn: () =>
      api('get', '/api/v1/branches/', {
        query: { kind: 'branch', is_active: true, page_size: 100 },
      }),
  });
  const list = useQuery({
    placeholderData: (prev) => prev,
    queryKey: ['dispatches', 'list', status, branch, page],
    queryFn: () =>
      api('get', '/api/v1/dispatches/', {
        query: {
          page,
          status: (status || undefined) as Status | undefined,
          destination_id: branch ? Number(branch) : undefined,
        },
      }),
  });

  const data = list.data;
  if (list.error instanceof ApiError && list.error.kind === 'forbidden') return <Forbidden />;
  const columns: Column<Dispatch>[] = [
    {
      id: 'ref',
      header: 'Reference',
      cell: (d) => (
        <Box component="span" sx={{ fontWeight: 600 }}>
          {d.reference}
        </Box>
      ),
    },
    {
      id: 'route',
      header: 'From and to',
      cell: (d) => `${d.origin.name} to ${d.destination.name}`,
    },
    {
      id: 'lines',
      header: 'Items',
      cell: (d) => (
        <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
            {unitsSent(d)} units · {formatAccra(d.dispatched_at)}
          </Box>
          {d.lines.map((l) => (
            <span key={l.id}>
              {l.qty_sent} × {l.item_name}
            </span>
          ))}
        </Box>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (d) => (
        <Box
          component="span"
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}
        >
          <StatusWord
            status={dispatchStatusBadge[d.status].status}
            label={dispatchStatusBadge[d.status].label}
          />
          {d.has_open_discrepancy && <StatusWord status="low" label="Open shortfall" />}
        </Box>
      ),
    },
  ];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Dispatch"
        actions={
          canCreate && (
            <LinkButton to="/dispatches/new" icon={Plus}>
              New dispatch
            </LinkButton>
          )
        }
      />
      {/* Status and branch are filters: they sit in the Toolbar (the Filters drawer on phones). */}
      <Toolbar>
        <Box sx={{ width: { xs: '100%', sm: 192 } }}>
          <SelectField
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {dispatchStatuses.map((s) => (
              <option key={s} value={s}>
                {dispatchStatusBadge[s].label}
              </option>
            ))}
          </SelectField>
        </Box>
        <Box sx={{ width: { xs: '100%', sm: 192 } }}>
          <SelectField
            label="Branch"
            value={branch}
            onChange={(e) => {
              setBranch(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All branches</option>
            {(branches.data ? rowsOf(branches.data) : []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </SelectField>
        </Box>
      </Toolbar>
      <DataTable
        caption="Dispatches"
        columns={columns}
        rows={data ? rowsOf(data) : []}
        rowKey={(d) => String(d.id)}
        state={list.isPending ? 'loading' : list.isError && !data ? 'error' : 'ready'}
        errorMessage={list.isError ? describeError(list.error).title : undefined}
        onRetry={() => void list.refetch()}
        empty={
          <EmptyState
            icon={Truck}
            title="No dispatches match"
            description="Change the status or the branch."
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
