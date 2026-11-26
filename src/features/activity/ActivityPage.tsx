import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter } from 'lucide-react';
import { api, ApiError, rowsOf } from '../../api';
import { ApiProblem } from '../../components/ApiProblem';
import { useCurrentMe } from '../../auth/guards';
import { Field } from '../../components/Field';
import { Pager } from '../../components/Pager';
import { QueryGate } from '../../components/QueryGate';
import { Select } from '../../components/Select';
import { ActivityList } from './ActivityList';
import { Button } from '../../components/ui';

const none = { user_id: '', branch_id: '', action: '', date_from: '', date_to: '' };

/** The audit trail the API lets this user read, newest first. Filters are sent to the API; scope is its decision. */
export function ActivityPage() {
  const perms = useCurrentMe().permissions;
  const [draft, setDraft] = useState(none);
  const [applied, setApplied] = useState(none);
  const [page, setPage] = useState(1);
  const [dateError, setDateError] = useState<string>();
  // shortcut: the User and Branch filters list only the first 100 users and branches (page_size 100), upgrade to a search box when there are more.
  const people = useQuery({
    enabled: perms.includes('users.view'),
    queryKey: ['users', 'activity-filter'],
    queryFn: () => api('get', '/api/v1/users/', { query: { page_size: 100 } }),
  });
  const places = useQuery({
    enabled: perms.includes('branches.view'),
    queryKey: ['branches', 'activity-filter'],
    queryFn: () => api('get', '/api/v1/branches/', { query: { page_size: 100 } }),
  });
  const list = useQuery({
    placeholderData: (prev) => prev,
    queryKey: ['activity', applied, page],
    queryFn: () =>
      api('get', '/api/v1/activity-log/', {
        query: {
          page,
          user_id: applied.user_id ? Number(applied.user_id) : undefined,
          branch_id: applied.branch_id ? Number(applied.branch_id) : undefined,
          action: applied.action.trim() || undefined,
          date_from: applied.date_from || undefined,
          date_to: applied.date_to || undefined,
        },
      }),
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
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-4xl text-ink">Activity</h1>
      <form onSubmit={apply} className="grid gap-3 sm:grid-cols-2" aria-label="Activity filters">
        {people.data && (
          <Select label="User" value={draft.user_id} onChange={set('user_id')}>
            <option value="">All users</option>
            {rowsOf(people.data).map((u) => (
              <option key={u.id} value={u.id}>
                {u.login_id} · {u.full_name}
              </option>
            ))}
          </Select>
        )}
        {places.data && (
          <Select label="Branch" value={draft.branch_id} onChange={set('branch_id')}>
            <option value="">All branches</option>
            {rowsOf(places.data).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        )}
        <Field
          label="Action"
          hint="For example dispatch_created. Leave empty for all."
          value={draft.action}
          maxLength={60}
          autoComplete="off"
          onChange={set('action')}
        />
        <Field label="From date" type="date" value={draft.date_from} onChange={set('date_from')} />
        <Field
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
      {/* A rejected filter (for example a backwards date range) is listed in words next to the form. */}
      {list.error instanceof ApiError && list.error.kind === 'validation' ? (
        <ApiProblem error={list.error} at={list.errorUpdatedAt} />
      ) : (
        <QueryGate query={list}>
          {(data) => {
            const rows = rowsOf(data);
            return (
              <>
                {rows.length === 0 && <p className="m-0 text-muted">No activity matches.</p>}
                <ActivityList events={rows} />
                <Pager page={data} onPage={setPage} />
              </>
            );
          }}
        </QueryGate>
      )}
    </div>
  );
}
