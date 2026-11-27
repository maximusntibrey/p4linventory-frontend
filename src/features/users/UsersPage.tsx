import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { api, rowsOf } from '../../api';
import type { components } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import { useBranchFilter } from '../workingBranch/BranchFilter';
import { QueryGate } from '../../components/QueryGate';
import { roleLabels, statusBadge } from './labels';
import { Button, Card, Pager, SelectField, StatusWord, TextField } from '../../components/ui';

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

  return (
    <div className="flex flex-col gap-4">
      <QueryGate query={list}>
        {(data) => (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-display">Users</h1>
              {canManage && (
                <Link
                  to="/users/new"
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-solid px-4 font-semibold text-on-primary no-underline hover:bg-primary-solid-hover"
                >
                  <Plus aria-hidden="true" size={20} />
                  <span>Add a user</span>
                </Link>
              )}
            </div>
            <form
              role="search"
              className="flex flex-col gap-3"
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
              <Button type="submit" variant="secondary" icon={Search}>
                Search
              </Button>
            </form>
            {rowsOf(data).length === 0 ? (
              <p className="m-0 text-muted">No users match.</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {rowsOf(data).map((u) => (
                  <li key={u.id}>
                    <Card className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-title">
                          <Link
                            to={`/users/${u.id}`}
                            className="inline-flex min-h-11 items-center text-ink underline"
                          >
                            {u.full_name}
                          </Link>
                        </h2>
                        <StatusWord status={statusBadge[u.status]} />
                      </div>
                      <p className="m-0 text-sm text-muted">
                        {u.login_id} · {u.roles.map((r) => roleLabels[r]).join(', ')}
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
            <Pager page={data} onPage={setPage} />
          </>
        )}
      </QueryGate>
    </div>
  );
}
