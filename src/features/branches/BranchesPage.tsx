import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, PowerOff, Save } from 'lucide-react';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey } from '../../api/idempotency';
import { useCurrentMe } from '../../auth/guards';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { Field } from '../../components/Field';
import { SuccessNotice, useReturnFocus } from '../../components/focus';
import { Pager } from '../../components/Pager';
import { QueryGate } from '../../components/QueryGate';
import { StatusBadge } from '../../components/StatusBadge';
import { Button, Card } from '../../components/ui';

type Branch = components['schemas']['Branch'];
type Values = { code: string; name: string };

function BranchForm({ branch, onClose }: { branch?: Branch; onClose: (saved: boolean) => void }) {
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  useReturnFocus();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ defaultValues: { code: branch?.code ?? '', name: branch?.name ?? '' } });
  const save = useMutation({
    mutationFn: (v: Values) => {
      const signature = `${branch?.id ?? 'new'}:${JSON.stringify(v)}`;
      const idempotencyKey = keys.forAction(signature);
      return branch
        ? api('patch', '/api/v1/branches/{id}/', {
            path: { id: branch.id },
            body: v,
            idempotencyKey,
          })
        : api('post', '/api/v1/branches/', { body: v, idempotencyKey });
    },
    onSuccess: async () => {
      keys.done();
      await qc.invalidateQueries({ queryKey: ['branches'] });
      onClose(true);
    },
  });
  const server = save.error instanceof ApiError ? save.error : undefined;
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-2xl">{branch ? `Edit ${branch.name}` : 'Add a branch'}</h2>
      <ApiProblem error={save.error} at={save.submittedAt} />
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => void handleSubmit((v) => save.mutate(v))(e)}
      >
        <Field
          label="Code"
          hint="A short code, for example ACC."
          autoComplete="off"
          error={errors.code?.message ?? server?.fieldError('code')}
          {...register('code', { required: 'Enter a code.' })}
        />
        <Field
          label="Name"
          autoComplete="off"
          error={errors.name?.message ?? server?.fieldError('name')}
          {...register('name', { required: 'Enter a name.' })}
        />
        <div className="flex flex-wrap gap-2">
          <Button type="submit" icon={Save} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save branch'}
          </Button>
          <Button variant="secondary" onClick={() => onClose(false)} disabled={save.isPending}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function BranchesPage() {
  const canManage = useCurrentMe().permissions.includes('branches.manage');
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Branch | 'new' | null>(null);
  const [confirm, setConfirm] = useState<Branch | null>(null);
  const [notice, setNotice] = useState<string>();
  const list = useQuery({
    queryKey: ['branches', 'list', page],
    queryFn: () => api('get', '/api/v1/branches/', { query: { page } }),
  });
  const toggle = useMutation({
    mutationFn: ({ branch, activate }: { branch: Branch; activate: boolean }) => {
      const idempotencyKey = keys.forAction(`${activate}:${branch.id}`);
      return activate
        ? api('post', '/api/v1/branches/{id}/activate/', {
            path: { id: branch.id },
            idempotencyKey,
          })
        : api('post', '/api/v1/branches/{id}/deactivate/', {
            path: { id: branch.id },
            idempotencyKey,
          });
    },
    onSuccess: async (b) => {
      keys.done();
      setConfirm(null);
      setNotice(`${b.name} is now ${b.is_active ? 'active' : 'deactivated'}.`);
      await qc.invalidateQueries({ queryKey: ['branches'] });
    },
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <QueryGate query={list}>
        {(data) => (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-4xl text-ink">Branches</h1>
              {canManage && !form && (
                <Button
                  icon={Plus}
                  onClick={() => {
                    setNotice(undefined);
                    setForm('new');
                  }}
                >
                  Add a branch
                </Button>
              )}
            </div>
            {notice && <SuccessNotice>{notice}</SuccessNotice>}
            {form && (
              <BranchForm
                key={form === 'new' ? 'new' : form.id}
                branch={form === 'new' ? undefined : form}
                onClose={(saved) => {
                  setForm(null);
                  if (saved) setNotice('Branch saved.');
                }}
              />
            )}
            {!confirm && <ApiProblem error={toggle.error} at={toggle.submittedAt} />}
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {rowsOf(data).map((b) => (
                <li key={b.id}>
                  <Card className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-2xl">{b.name}</h2>
                      <StatusBadge status={b.is_active ? 'active' : 'deactivated'} />
                    </div>
                    <p className="m-0 text-sm text-muted">
                      Code {b.code} · {b.kind === 'warehouse' ? 'Warehouse' : 'Branch'}
                    </p>
                    {canManage && (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          icon={Pencil}
                          aria-label={`Edit ${b.name}`}
                          onClick={() => {
                            setNotice(undefined);
                            setForm(b);
                          }}
                        >
                          Edit
                        </Button>
                        {b.is_active ? (
                          <Button
                            variant="danger"
                            icon={PowerOff}
                            aria-label={`Deactivate ${b.name}`}
                            onClick={() => {
                              toggle.reset();
                              setNotice(undefined);
                              setConfirm(b);
                            }}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            icon={Power}
                            aria-label={`Activate ${b.name}`}
                            disabled={toggle.isPending}
                            onClick={() => toggle.mutate({ branch: b, activate: true })}
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    )}
                    {confirm?.id === b.id && (
                      <>
                        <ApiProblem error={toggle.error} at={toggle.submittedAt} />
                        <ConfirmPanel
                          title={`Deactivate ${b.name}? Its history is kept.`}
                          confirmLabel="Yes, deactivate"
                          pending={toggle.isPending}
                          onConfirm={() => toggle.mutate({ branch: b, activate: false })}
                          onCancel={() => setConfirm(null)}
                        />
                      </>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
            <Pager page={data} onPage={setPage} />
          </>
        )}
      </QueryGate>
    </div>
  );
}
