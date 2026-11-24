import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { api, rowsOf } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import { Card } from '../../components/Card';
import { Pager } from '../../components/Pager';
import { QueryGate } from '../../components/QueryGate';
import { Select } from '../../components/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { formatAccra } from '../../lib/time';
import { dispatchStatusBadge, dispatchStatuses, unitsSent } from './labels';
import type { components } from '../../api';

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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-4xl text-ink">Dispatch</h1>
      {canCreate && (
        <Link
          to="/dispatches/new"
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-transparent bg-accent px-4 font-semibold text-white hover:bg-accent-hover"
        >
          <Plus aria-hidden="true" size={20} />
          <span>New dispatch</span>
        </Link>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
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
        </Select>
        <Select
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
        </Select>
      </div>
      <QueryGate query={list}>
        {(data) => {
          const rows = rowsOf(data);
          return (
            <>
              {rows.length === 0 && <p className="m-0 text-muted">No dispatches match.</p>}
              <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
                {rows.map((d) => {
                  const badge = dispatchStatusBadge[d.status];
                  return (
                    <li key={d.id}>
                      <Card className="flex h-full flex-col gap-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="m-0 text-lg font-semibold">{d.reference}</p>
                          <StatusBadge status={badge.status} label={badge.label} />
                        </div>
                        <p className="m-0 break-words">
                          {d.origin.name} to {d.destination.name}
                        </p>
                        <p className="m-0 text-sm text-muted">
                          {unitsSent(d)} units · {formatAccra(d.dispatched_at)}
                        </p>
                        <ul className="m-0 list-none p-0 text-sm">
                          {d.lines.map((l) => (
                            <li key={l.id} className="break-words">
                              {l.qty_sent} × {l.item_name}
                            </li>
                          ))}
                        </ul>
                        {d.has_open_discrepancy && (
                          <StatusBadge status="low" label="Open shortfall" />
                        )}
                      </Card>
                    </li>
                  );
                })}
              </ul>
              <Pager page={data} onPage={setPage} />
            </>
          );
        }}
      </QueryGate>
    </div>
  );
}
