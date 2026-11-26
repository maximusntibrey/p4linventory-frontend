import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { api, rowsOf } from '../../api';
import { useIdempotencyKey } from '../../api/idempotency';
import { useCurrentMe } from '../../auth/guards';
import { dropBranchScoped, meKey } from '../../auth/session';
import { ApiProblem } from '../../components/ApiProblem';
import { QueryGate } from '../../components/QueryGate';
import { Button } from '../../components/ui';

type Props = {
  /** Switching from a branch already chosen: Cancel is offered. When it is the required first pick there is none. */
  onCancel?: () => void;
  onDone: () => void;
};

/** Pick or switch the working branch. The API decides who may; the list is what it returns. One tap on a branch sends the choice. */
export function BranchPicker({ onCancel, onDone }: Props) {
  const me = useCurrentMe();
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const list = useQuery({
    queryKey: ['branches', 'pick'],
    queryFn: () =>
      api('get', '/api/v1/branches/', {
        query: { kind: 'branch', is_active: true, page_size: 100 },
      }),
  });
  const choose = useMutation({
    mutationFn: (branchId: number) =>
      api('put', '/api/v1/working-branch/', {
        body: { branch_id: branchId },
        idempotencyKey: keys.forAction(String(branchId)),
      }),
    onSuccess: (updated) => {
      keys.done();
      qc.setQueryData(meKey, updated);
      // Everything the old branch scoped is dropped, not just stale; /me was just replaced.
      dropBranchScoped(qc);
      onDone();
    },
  });
  const current = me.working_branch?.id;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-display">{current ? 'Switch branch' : 'Choose your branch'}</h1>
      <p className="m-0 text-muted">Pick the branch you are working at.</p>
      <ApiProblem error={choose.error} at={choose.submittedAt} />
      <QueryGate query={list}>
        {(page) =>
          rowsOf(page).length === 0 ? (
            <p className="m-0 text-muted">No branches are available to you.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {rowsOf(page).map((b) => (
                <li key={b.id}>
                  <Button
                    variant={b.id === current ? 'primary' : 'secondary'}
                    icon={b.id === current ? Check : undefined}
                    className="w-full justify-start"
                    aria-current={b.id === current ? 'true' : undefined}
                    disabled={choose.isPending}
                    onClick={() => choose.mutate(b.id)}
                  >
                    {b.name}
                    {b.id === current ? ' (current)' : ''}
                  </Button>
                </li>
              ))}
            </ul>
          )
        }
      </QueryGate>
      {onCancel && (
        <Button variant="secondary" onClick={onCancel} disabled={choose.isPending}>
          Cancel
        </Button>
      )}
    </div>
  );
}
