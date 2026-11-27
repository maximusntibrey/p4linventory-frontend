import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Truck } from 'lucide-react';
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
      cell: (d) => <span className="font-semibold">{d.reference}</span>,
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
        <span className="flex flex-col">
          <span className="text-sm text-muted">
            {unitsSent(d)} units · {formatAccra(d.dispatched_at)}
          </span>
          {d.lines.map((l) => (
            <span key={l.id}>
              {l.qty_sent} × {l.item_name}
            </span>
          ))}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (d) => (
        <span className="flex flex-col items-start gap-1">
          <StatusWord
            status={dispatchStatusBadge[d.status].status}
            label={dispatchStatusBadge[d.status].label}
          />
          {d.has_open_discrepancy && <StatusWord status="low" label="Open shortfall" />}
        </span>
      ),
    },
  ];
  return (
    <div className="flex flex-col gap-4">
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
      <div className="grid gap-3 sm:grid-cols-2">
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
      </div>
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
    </div>
  );
}
