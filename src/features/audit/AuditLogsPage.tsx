import { useDeferredValue, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Download, Filter, ScrollText } from 'lucide-react';
import { api, apiCsv, ApiError, rowsOf } from '../../api';
import type { components, paths } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import { ApiProblem } from '../../components/ApiProblem';
import { describeError } from '../../components/ErrorSummary';
import { Forbidden } from '../../pages/Forbidden';
import { formatAccra } from '../../lib/time';
import {
  Drawer,
  Button,
  DataTable,
  EmptyState,
  PageHeader,
  SelectField,
  StatusBadge,
  TextField,
  Toolbar,
} from '../../components/ui';
import type { Column, SortState } from '../../components/ui';
import { humanise } from './humanise';

type Event = components['schemas']['ActivityEvent'];
type Ordering = NonNullable<
  NonNullable<paths['/api/v1/activity-log/']['get']['parameters']['query']>['ordering']
>;

const none = {
  user_id: '',
  branch_id: '',
  action: '',
  target_type: '',
  date_from: '',
  date_to: '',
};
const PAGE_SIZES = [10, 25, 50, 100];

/** Sort state of the table to the API's `ordering` value (default is newest first). */
const orderingOf = (sort: SortState) =>
  sort ? `${sort.direction === 'desc' ? '-' : ''}${sort.id}` : '-timestamp';

const columns: Column<Event>[] = [
  {
    id: 'user',
    header: 'User',
    sortValue: (e) => e.user_login_id,
    cell: (e) => (
      <span className="flex flex-col">
        <span className="font-semibold">{e.user_login_id}</span>
        <span className="text-sm text-muted">{humanise(e.user_role)}</span>
      </span>
    ),
  },
  {
    id: 'action',
    header: 'Action',
    sortValue: (e) => e.action,
    cell: (e) => humanise(e.action),
  },
  {
    id: 'module',
    header: 'Module',
    cell: (e) => (
      <span className="flex flex-col">
        <span>{humanise(e.target_type)}</span>
        <span className="text-sm break-all text-muted">{e.target_ref}</span>
      </span>
    ),
  },
  {
    id: 'details',
    header: 'Details',
    cell: (e) => (
      <span className="flex flex-col items-start gap-1">
        <span>{e.branch_name ?? 'No branch'}</span>
        {e.is_self_approval && <StatusBadge tone="warning">Self-approved</StatusBadge>}
      </span>
    ),
  },
  {
    id: 'timestamp',
    header: 'Time',
    sortValue: (e) => e.occurred_at,
    cell: (e) => <span className="whitespace-nowrap">{formatAccra(e.occurred_at)}</span>,
  },
];

/** The audit trail the API lets this user read. Search, filters, order and paging are all sent to the API; scope is its decision. */
export function AuditLogsPage() {
  const perms = useCurrentMe().permissions;
  const [draft, setDraft] = useState(none);
  const [applied, setApplied] = useState(none);
  const [search, setSearch] = useState('');
  const q = useDeferredValue(search.trim());
  const [sort, setSort] = useState<SortState>({ id: 'timestamp', direction: 'desc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dateError, setDateError] = useState<string>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  // shortcut: the User filter lists only the first 100 users (page_size 100), upgrade to a search box when there are more.
  const places = useQuery({
    enabled: perms.includes('branches.view'),
    queryKey: ['branches', 'activity-filter'],
    queryFn: () => api('get', '/api/v1/branches/', { query: { page_size: 100 } }),
  });
  const people = useQuery({
    enabled: perms.includes('users.view'),
    queryKey: ['users', 'activity-filter'],
    queryFn: () => api('get', '/api/v1/users/', { query: { page_size: 100 } }),
  });
  const filters = {
    user_id: applied.user_id ? Number(applied.user_id) : undefined,
    branch_id: applied.branch_id ? Number(applied.branch_id) : undefined,
    action: applied.action.trim() || undefined,
    target_type: applied.target_type.trim() || undefined,
    date_from: applied.date_from || undefined,
    date_to: applied.date_to || undefined,
    search: q || undefined,
    ordering: orderingOf(sort) as Ordering,
  };
  const list = useQuery({
    placeholderData: (prev) => prev,
    queryKey: ['activity', filters, page, pageSize],
    queryFn: () =>
      api('get', '/api/v1/activity-log/', { query: { page, page_size: pageSize, ...filters } }),
  });
  const download = useMutation({
    mutationFn: () => apiCsv('/api/v1/activity-log/export/', filters),
    onSuccess: ({ text }) => {
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'audit-logs.csv';
      a.click();
      URL.revokeObjectURL(url);
    },
  });
  const set = (k: keyof typeof none) => (e: { target: { value: string } }) =>
    setDraft({ ...draft, [k]: e.target.value });
  const apply = (e: FormEvent) => {
    e.preventDefault();
    if (draft.date_from && draft.date_to && draft.date_from > draft.date_to) {
      setDateError('The end date is before the start date.');
      return;
    }
    setDateError(undefined);
    setApplied(draft);
    setPage(1);
    setFiltersOpen(false);
  };

  if (list.error instanceof ApiError && list.error.kind === 'forbidden') return <Forbidden />;
  const rejected = list.error instanceof ApiError && list.error.kind === 'validation';
  const data = list.data;
  const failed = list.isError && !data;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Audit Logs"
        subtitle="Who did what, where and when. Metadata only."
        actions={
          <Button
            variant="secondary"
            icon={Download}
            onClick={() => download.mutate()}
            disabled={download.isPending}
          >
            {download.isPending ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />
      <ApiProblem error={download.error} at={download.submittedAt} />
      {download.data?.truncated && (
        <p role="status" className="m-0 flex flex-wrap items-center gap-2 font-semibold">
          <StatusBadge tone="warning">Export cut</StatusBadge>
          Only the first 5000 rows were exported. Narrow the filters to get the rest.
        </p>
      )}
      <Toolbar
        search={{
          label: 'Search action, module, reference or login ID',
          value: search,
          onChange: (v) => {
            setSearch(v);
            setPage(1);
          },
        }}
        onFilter={() => setFiltersOpen(true)}
      />
      {/* User, branch, action, module and dates live in the Toolbar's Filter drawer, like every other list. */}
      <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filters">
        <form onSubmit={apply} className="grid gap-3" aria-label="Audit log filters">
          {people.data && (
            <SelectField label="User" value={draft.user_id} onChange={set('user_id')}>
              <option value="">All users</option>
              {rowsOf(people.data).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.login_id} · {u.full_name}
                </option>
              ))}
            </SelectField>
          )}
          {places.data && (
            <SelectField label="Branch" value={draft.branch_id} onChange={set('branch_id')}>
              <option value="">All branches</option>
              {rowsOf(places.data).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </SelectField>
          )}
          <TextField
            label="Action"
            hint="For example dispatch_created. Leave empty for all."
            value={draft.action}
            maxLength={60}
            autoComplete="off"
            onChange={set('action')}
          />
          <TextField
            label="Module"
            hint="For example dispatch or sale. Leave empty for all."
            value={draft.target_type}
            maxLength={40}
            autoComplete="off"
            onChange={set('target_type')}
          />
          <TextField
            label="From date"
            type="date"
            value={draft.date_from}
            onChange={set('date_from')}
          />
          <TextField
            label="To date"
            type="date"
            value={draft.date_to}
            error={dateError}
            onChange={set('date_to')}
          />
          <div className="flex items-end">
            <Button type="submit" icon={Filter}>
              Apply filters
            </Button>
          </div>
        </form>
      </Drawer>
      {/* A rejected filter (for example a backwards date range) is listed in words above the table. */}
      {rejected && <ApiProblem error={list.error} at={list.errorUpdatedAt} />}
      <DataTable
        caption="Audit log"
        columns={columns}
        rows={data ? rowsOf(data) : []}
        rowKey={(e) => String(e.id)}
        state={list.isPending ? 'loading' : failed && !rejected ? 'error' : 'ready'}
        errorMessage={failed ? describeError(list.error).title : undefined}
        onRetry={() => void list.refetch()}
        sort={sort}
        onSortChange={(s) => {
          setSort(s);
          setPage(1);
        }}
        empty={
          <EmptyState
            icon={ScrollText}
            title="No activity matches"
            description="Change the search or the filters."
          />
        }
        pagination={
          data
            ? {
                page: data.page,
                pageCount: Math.max(1, Math.ceil(data.count / data.page_size)),
                onPageChange: setPage,
                pageSize,
                pageSizeOptions: PAGE_SIZES,
                onPageSizeChange: (n) => {
                  setPageSize(n);
                  setPage(1);
                },
              }
            : undefined
        }
      />
    </div>
  );
}
