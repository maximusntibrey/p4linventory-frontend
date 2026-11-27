import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, KeyRound, Save } from 'lucide-react';
import { api } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey } from '../../api/idempotency';
import { useCurrentMe } from '../../auth/guards';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { SuccessNotice } from '../../components/focus';
import { QueryGate } from '../../components/QueryGate';
import { permissionCodes, permissionLabels, roleLabels, statusBadge } from './labels';
import { OneTimePassword } from './OneTimePassword';
import { UserForm } from './UserForm';
import { Button, Card, PageHeader, StatusWord, TextField } from '../../components/ui';

type S = components['schemas'];
type Target = 'active' | 'suspended' | 'deactivated';
const targets: { status: Target; label: string; danger: boolean }[] = [
  { status: 'active', label: 'Activate', danger: false },
  { status: 'suspended', label: 'Suspend', danger: true },
  { status: 'deactivated', label: 'Deactivate', danger: true },
];
const statusWord: Record<Target, string> = {
  active: 'active',
  suspended: 'suspended',
  deactivated: 'deactivated',
};

function PermissionsCard({ user }: { user: S['User'] }) {
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const current = useQuery({
    queryKey: ['users', user.id, 'permissions'],
    queryFn: () => api('get', '/api/v1/users/{id}/permissions/', { path: { id: user.id } }),
  });
  return (
    <Card className="flex flex-col gap-3">
      <h2 className="text-title">Permissions</h2>
      <QueryGate query={current} inline>
        {(data) => (
          <PermissionsForm
            key={data.permissions.join(',')}
            initial={data.permissions}
            userId={user.id}
            keys={keys}
            onSaved={() => qc.invalidateQueries({ queryKey: ['users'] })}
          />
        )}
      </QueryGate>
    </Card>
  );
}

function PermissionsForm({
  initial,
  userId,
  keys,
  onSaved,
}: {
  initial: S['PersonPermission'][];
  userId: number;
  keys: ReturnType<typeof useIdempotencyKey>;
  onSaved: () => Promise<unknown>;
}) {
  const [chosen, setChosen] = useState(new Set(initial));
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: (permissions: S['PersonPermission'][]) =>
      api('put', '/api/v1/users/{id}/permissions/', {
        path: { id: userId },
        body: { permissions },
        idempotencyKey: keys.forAction(permissions.join(',')),
      }),
    onSuccess: async () => {
      keys.done();
      setSaved(true);
      await onSaved();
    },
  });
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setSaved(false);
        save.mutate(permissionCodes.filter((c) => chosen.has(c)));
      }}
    >
      <ApiProblem error={save.error} at={save.submittedAt} />
      <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
        <legend className="mb-1 p-0 text-muted">Extra things this person may do.</legend>
        {permissionCodes.map((code) => (
          <label key={code} className="flex min-h-target items-center gap-3">
            <input
              type="checkbox"
              className="size-5 accent-primary-solid"
              checked={chosen.has(code)}
              onChange={(e) => {
                const next = new Set(chosen);
                if (e.target.checked) next.add(code);
                else next.delete(code);
                setChosen(next);
              }}
            />
            <span>{permissionLabels[code]}</span>
          </label>
        ))}
      </fieldset>
      {saved && <SuccessNotice>Permissions saved.</SuccessNotice>}
      <Button type="submit" icon={Save} disabled={save.isPending}>
        {save.isPending ? 'Saving…' : 'Save permissions'}
      </Button>
    </form>
  );
}

function UserView({ user, canManage }: { user: S['User']; canManage: boolean }) {
  const qc = useQueryClient();
  // One key per action: another action in between must not replace a failed one's key.
  const editKeys = useIdempotencyKey();
  const statusKeys = useIdempotencyKey();
  const resetKeys = useIdempotencyKey();
  const [notice, setNotice] = useState<string>();
  const [otp, setOtp] = useState<{ password: string; expiresAt: string }>();
  const [confirm, setConfirm] = useState<Target | 'reset' | null>(null);
  const [reason, setReason] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['users'] });

  const edit = useMutation({
    mutationFn: (body: S['UserUpdate']) =>
      api('patch', '/api/v1/users/{id}/', {
        path: { id: user.id },
        body,
        idempotencyKey: editKeys.forAction(JSON.stringify(body)),
      }),
    onSuccess: async () => {
      editKeys.done();
      setNotice('Changes saved.');
      await refresh();
    },
  });
  const status = useMutation({
    mutationFn: (to: Target) =>
      api('post', '/api/v1/users/{id}/status/', {
        path: { id: user.id },
        body: { status: to, ...(reason.trim() ? { reason: reason.trim() } : {}) },
        idempotencyKey: statusKeys.forAction(`${to}:${reason.trim()}`),
      }),
    onSuccess: async (u, to) => {
      statusKeys.done();
      setConfirm(null);
      setReason('');
      setNotice(`${u.full_name} is now ${statusWord[to]}.`);
      await refresh();
    },
  });
  const reset = useMutation({
    mutationFn: () =>
      api('post', '/api/v1/users/{id}/reset-password/', {
        path: { id: user.id },
        idempotencyKey: resetKeys.forAction('reset'),
      }),
    gcTime: 0, // the one-time password must not linger in the mutation cache
  });
  const doReset = () =>
    reset.mutate(undefined, {
      onSuccess: async (r) => {
        resetKeys.done();
        setConfirm(null);
        setNotice(undefined);
        setOtp({ password: r.one_time_password, expiresAt: r.one_time_password_expires_at });
        reset.reset(); // the mutation hook must not keep the password either
        await refresh();
      },
    });

  const closeConfirm = () => {
    setConfirm(null);
    setReason('');
    status.reset();
    reset.reset();
  };

  return (
    <>
      <div className="flex flex-col gap-2">
        <PageHeader title={user.full_name} />
        <p className="m-0 flex flex-wrap items-center gap-2 text-muted">
          <span>{user.login_id}</span>
          <span aria-hidden="true">·</span>
          <span>{user.roles.map((r) => roleLabels[r]).join(', ')}</span>
          <StatusWord status={statusBadge[user.status]} />
        </p>
      </div>
      {notice && <SuccessNotice>{notice}</SuccessNotice>}
      {otp && (
        <OneTimePassword
          loginId={user.login_id}
          password={otp.password}
          expiresAt={otp.expiresAt}
          onDone={() => setOtp(undefined)}
        />
      )}
      {canManage && (
        <>
          <Card className="flex flex-col gap-3">
            <h2 className="text-title">Details</h2>
            <ApiProblem error={edit.error} at={edit.submittedAt} />
            <UserForm
              key={`${user.full_name}|${user.roles.join()}|${user.permanent_location_id}`}
              user={user}
              pending={edit.isPending}
              error={edit.error}
              submitLabel="Save changes"
              onSubmit={(body) => {
                setNotice(undefined);
                edit.mutate(body);
              }}
            />
          </Card>
          <Card className="flex flex-col gap-3">
            <h2 className="text-title">Account</h2>
            <div className="flex flex-wrap gap-2">
              {targets
                .filter((t) => t.status !== user.status)
                .map((t) => (
                  <Button
                    key={t.status}
                    variant={t.danger ? 'danger' : 'secondary'}
                    onClick={() => {
                      closeConfirm();
                      setNotice(undefined);
                      setConfirm(t.status);
                    }}
                  >
                    {t.label}
                  </Button>
                ))}
              <Button
                variant="secondary"
                icon={KeyRound}
                onClick={() => {
                  closeConfirm();
                  setNotice(undefined);
                  setOtp(undefined);
                  setConfirm('reset');
                }}
              >
                Reset password
              </Button>
            </div>
            {confirm === 'reset' && (
              <>
                <ApiProblem error={reset.error} at={reset.submittedAt} />
                <ConfirmPanel
                  title={`Reset the password for ${user.full_name}? They are signed out and get a new one-time password.`}
                  confirmLabel="Yes, reset password"
                  pending={reset.isPending}
                  onConfirm={doReset}
                  onCancel={closeConfirm}
                />
              </>
            )}
            {confirm && confirm !== 'reset' && (
              <>
                <ApiProblem error={status.error} at={status.submittedAt} />
                <ConfirmPanel
                  title={`${targets.find((t) => t.status === confirm)?.label} ${user.full_name}?${
                    confirm === 'active' ? '' : ' They are signed out at once. History is kept.'
                  }`}
                  confirmLabel={`Yes, ${targets.find((t) => t.status === confirm)?.label.toLowerCase()}`}
                  danger={confirm !== 'active'}
                  pending={status.isPending}
                  onConfirm={() => status.mutate(confirm)}
                  onCancel={closeConfirm}
                >
                  <TextField
                    label="Reason (optional)"
                    maxLength={500}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </ConfirmPanel>
              </>
            )}
          </Card>
          <PermissionsCard user={user} />
        </>
      )}
    </>
  );
}

export function UserDetail() {
  const id = Number(useParams().id);
  const canManage = useCurrentMe().permissions.includes('users.manage');
  const query = useQuery({
    queryKey: ['users', id],
    queryFn: () => api('get', '/api/v1/users/{id}/', { path: { id } }),
  });
  return (
    <div className="flex flex-col gap-4">
      <QueryGate query={query}>{(u) => <UserView user={u} canManage={canManage} />}</QueryGate>
      <Link
        to="/users"
        className="inline-flex min-h-target items-center gap-2 font-semibold text-primary-solid underline"
      >
        <ArrowLeft aria-hidden="true" size={20} />
        <span>Back to users</span>
      </Link>
    </div>
  );
}
