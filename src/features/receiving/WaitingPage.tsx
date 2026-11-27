import { useState } from 'react';
import Box from '@mui/material/Box';
import { useQuery } from '@tanstack/react-query';
import { PackageCheck } from 'components/icons';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import { describeError } from '../../components/ErrorSummary';
import { Forbidden } from '../../pages/Forbidden';
import { formatAccra } from '../../lib/time';
import { unitsSent } from '../dispatches/labels';
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

/**
 * What is waiting at a branch. The working branch comes from /me; when /me has none (the Super Admin),
 * the user picks a branch, because the API wants a branch_id then.
 */
export function WaitingPage() {
  const own = useCurrentMe().working_branch;
  const [picked, setPicked] = useState('');
  const [page, setPage] = useState(1);
  const branches = useQuery({
    enabled: !own,
    queryKey: ['waiting', 'branches'],
    queryFn: () =>
      api('get', '/api/v1/branches/', {
        query: { kind: 'branch', is_active: true, page_size: 100 },
      }),
  });
  const branchId = own?.id ?? (picked ? Number(picked) : undefined);
  const list = useQuery({
    enabled: branchId !== undefined,
    placeholderData: (prev) => prev,
    queryKey: ['dispatches', 'waiting', branchId, page],
    queryFn: () =>
      api('get', '/api/v1/dispatches/waiting/', { query: { page, branch_id: branchId } }),
  });
  const branchName =
    own?.name ??
    (branches.data ? rowsOf(branches.data) : []).find((b) => String(b.id) === picked)?.name;

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
    { id: 'from', header: 'From', cell: (d) => `From ${d.origin.name}` },
    {
      id: 'size',
      header: 'Size',
      cell: (d) => (
        <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
          {unitsSent(d)} units in {d.lines.length} line{d.lines.length === 1 ? '' : 's'} · sent{' '}
          {formatAccra(d.dispatched_at)}
        </Box>
      ),
    },
    { id: 'status', header: 'Status', cell: () => <StatusWord status="in-transit" /> },
    {
      id: 'action',
      header: 'Action',
      cell: (d) => (
        <LinkButton
          to={`/receive/${d.id}`}
          icon={PackageCheck}
          aria-label={`Check delivery ${d.reference}`}
        >
          Check delivery
        </LinkButton>
      ),
    },
  ];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Receive" />
      {!own && (
        <SelectField
          label="Branch"
          value={picked}
          onChange={(e) => {
            setPicked(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Choose a branch…</option>
          {(branches.data ? rowsOf(branches.data) : []).map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </SelectField>
      )}
      {branchId === undefined ? (
        <EmptyState
          icon={PackageCheck}
          title="Choose a branch"
          description="Choose a branch to see what is waiting there."
        />
      ) : (
        <>
          <Box component="h2" sx={{ typography: 'h4' }}>
            Waiting at {branchName ?? 'this branch'}
          </Box>
          <DataTable
            caption="Waiting deliveries"
            columns={columns}
            rows={data ? rowsOf(data) : []}
            rowKey={(d) => String(d.id)}
            state={list.isPending ? 'loading' : list.isError && !data ? 'error' : 'ready'}
            errorMessage={list.isError ? describeError(list.error).title : undefined}
            onRetry={() => void list.refetch()}
            empty={
              <EmptyState
                icon={PackageCheck}
                title="Nothing is waiting to be received"
                description="New deliveries show here."
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
        </>
      )}
    </Box>
  );
}
