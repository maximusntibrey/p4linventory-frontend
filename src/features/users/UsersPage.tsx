import { useState } from 'react';
import Box from '@mui/material/Box';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search, Users } from 'components/icons';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import { useBranchFilter } from '../workingBranch/BranchFilter';
import { BranchScope } from '../workingBranch/BranchScope';
import { describeError } from '../../components/ErrorSummary';
import { Forbidden } from '../../pages/Forbidden';
import { roleLabels, statusBadge } from './labels';
import {
  Button,
  DataTable,
  EmptyState,
  LinkButton,
  PageHeader,
  SelectField,
  StatusWord,
  TextField,
} from '../../components/ui';
import type { Column } from '../../components/ui';

type User = components['schemas']['User'];
type UserStatus = components['schemas']['UserStatus'];
const statuses: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'pending_activation', label: 'Pending activation' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deactivated', label: 'Deactivated' },
];

export function UsersPage() {
  const canManage = useCurrentMe().permissions.includes('users.manage');
  const [filters, setFilters] = useState<{ q: string; status: UserStatus | '' }>({
    q: '',
    status: '',
  });
  const [draft, setDraft] = useState(filters);
  const [page, setPage] = useState(1);
  const { branch } = useBranchFilter();
  const [seenBranch, setSeenBranch] = useState(branch);
  if (seenBranch !== branch) {
    setSeenBranch(branch);
    setPage(1);
  }
  const list = useQuery({
    // Keep the search box mounted while a new search loads, but never show another branch's rows.
    placeholderData: (prev, prevQuery) => (prevQuery?.queryKey[4] === branch ? prev : undefined),
    queryKey: ['users', 'list', filters, page, branch],
    queryFn: () =>
      api('get', '/api/v1/users/', {
        query: { page, branch, q: filters.q || undefined, status: filters.status || undefined },
      }),
  });

  const data = list.data;
  if (list.error instanceof ApiError && list.error.kind === 'forbidden') return <Forbidden />;
  const columns: Column<User>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (u) => (
        <Box
          component={Link}
          to={`/users/${u.id}`}
          sx={{
            display: 'inline-flex',
            minHeight: 44,
            alignItems: 'center',
            fontWeight: 600,
            color: 'text.primary',
            textDecoration: 'underline',
          }}
        >
          {u.full_name}
        </Box>
      ),
    },
    { id: 'login', header: 'Login ID', cell: (u) => u.login_id },
    { id: 'roles', header: 'Roles', cell: (u) => u.roles.map((r) => roleLabels[r]).join(', ') },
    { id: 'status', header: 'Status', cell: (u) => <StatusWord status={statusBadge[u.status]} /> },
  ];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Users"
        actions={
          canManage && (
            <LinkButton to="/users/new" icon={Plus}>
              Add a user
            </LinkButton>
          )
        }
      />
      <BranchScope />
      <Box
        component="form"
        role="search"
        sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { sm: 'repeat(3, minmax(0, 1fr))' } }}
        onSubmit={(e) => {
          e.preventDefault();
          setFilters(draft);
          setPage(1);
        }}
      >
        <TextField
          label="Search by name or login ID"
          value={draft.q}
          onChange={(e) => setDraft({ ...draft, q: e.target.value })}
        />
        <SelectField
          label="Status"
          value={draft.status}
          onChange={(e) => setDraft({ ...draft, status: e.target.value as UserStatus | '' })}
        >
          <option value="">All</option>
          {statuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </SelectField>
        <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button type="submit" variant="secondary" icon={Search}>
            Search
          </Button>
        </Box>
      </Box>
      <DataTable
        caption="Users"
        columns={columns}
        rows={data ? rowsOf(data) : []}
        rowKey={(u) => String(u.id)}
        state={list.isPending ? 'loading' : list.isError ? 'error' : 'ready'}
        errorMessage={list.isError ? describeError(list.error).title : undefined}
        onRetry={() => void list.refetch()}
        empty={<EmptyState icon={Users} title="No users match" description="Change the search." />}
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
