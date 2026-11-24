import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PackageCheck } from 'lucide-react';
import { api, rowsOf } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import { Card } from '../../components/Card';
import { Pager } from '../../components/Pager';
import { QueryGate } from '../../components/QueryGate';
import { Select } from '../../components/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { formatAccra } from '../../lib/time';
import { unitsSent } from '../dispatches/labels';

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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-4xl text-ink">Receive</h1>
      {!own && (
        <Select
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
        </Select>
      )}
      {branchId === undefined ? (
        <p className="m-0 text-muted">Choose a branch to see what is waiting there.</p>
      ) : (
        <QueryGate query={list}>
          {(data) => {
            const rows = rowsOf(data);
            return (
              <>
                <h2 className="text-3xl">Waiting at {branchName ?? 'this branch'}</h2>
                {rows.length === 0 && (
                  <p className="m-0 text-muted">Nothing is waiting to be received.</p>
                )}
                <ul className="m-0 grid list-none gap-3 p-0 md:grid-cols-2">
                  {rows.map((d) => (
                    <li key={d.id}>
                      <Card className="flex h-full flex-col gap-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="m-0 text-lg font-semibold">{d.reference}</p>
                          <StatusBadge status="in-transit" />
                        </div>
                        <p className="m-0 break-words">From {d.origin.name}</p>
                        <p className="m-0 text-sm text-muted">
                          {unitsSent(d)} units in {d.lines.length} line
                          {d.lines.length === 1 ? '' : 's'} · sent {formatAccra(d.dispatched_at)}
                        </p>
                        <Link
                          to={`/receive/${d.id}`}
                          aria-label={`Check delivery ${d.reference}`}
                          className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg border border-transparent bg-accent px-4 font-semibold text-white hover:bg-accent-hover"
                        >
                          <PackageCheck aria-hidden="true" size={20} />
                          <span>Check delivery</span>
                        </Link>
                      </Card>
                    </li>
                  ))}
                </ul>
                <Pager page={data} onPage={setPage} />
              </>
            );
          }}
        </QueryGate>
      )}
    </div>
  );
}
