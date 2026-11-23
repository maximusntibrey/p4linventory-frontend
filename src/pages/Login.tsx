import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogIn } from 'lucide-react';
import { api, ApiError } from '../api';
import { sessionEndedKey } from '../api/queryClient';
import { meKey, useMe } from '../auth/session';
import { AuthLayout } from '../components/AuthLayout';
import { Button } from '../components/Button';
import { describeError, ErrorSummary } from '../components/ErrorSummary';
import type { ErrorParts } from '../components/ErrorSummary';
import { Field } from '../components/Field';

type Values = { login_id: string; password: string };

export function Login() {
  const me = useMe();
  const qc = useQueryClient();
  const state = useLocation().state as { from?: string; reason?: string } | null;
  const from = state?.from;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>();
  const [failure, setFailure] = useState<{ error: unknown; n: number }>();
  const [invalidN, setInvalidN] = useState(0);

  const login = useMutation({
    mutationFn: (v: Values) =>
      api('post', '/api/v1/auth/login/', {
        body: { login_id: v.login_id.trim(), password: v.password },
      }),
    meta: { keepSession: true },
    gcTime: 0, // the password must not linger in the mutation cache
    onSuccess: (data) => {
      qc.removeQueries({ queryKey: sessionEndedKey });
      qc.setQueryData(meKey, data);
    },
    onError: (error) => setFailure((f) => ({ error, n: (f?.n ?? 0) + 1 })),
  });

  // Already signed in (or just signed in): the guards decide where the user may go.
  if (me.data) return <Navigate to={from ?? '/'} replace />;

  const server = failure?.error instanceof ApiError ? failure.error : undefined;
  const clientMessages = Object.values(errors).flatMap((e) => (e?.message ? [e.message] : []));
  const summary: (ErrorParts & { n: string }) | undefined = failure
    ? { ...describeError(failure.error), n: `s${failure.n}` }
    : clientMessages.length
      ? { title: 'Check the highlighted fields.', items: clientMessages, n: `c${invalidN}` }
      : undefined;

  return (
    <AuthLayout title="Sign in">
      {state?.reason === 'expired' && (
        <p role="status" className="m-0 font-semibold">
          Your session has ended. Sign in again.
        </p>
      )}
      {summary && <ErrorSummary key={summary.n} title={summary.title} items={summary.items} />}
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          setFailure(undefined);
          void handleSubmit(
            (v) => login.mutate(v),
            () => setInvalidN((n) => n + 1),
          )(e);
        }}
      >
        <Field
          label="Login ID"
          hint="For example SA-0001 or USR-0001."
          autoComplete="username"
          autoCapitalize="characters"
          spellCheck={false}
          error={errors.login_id?.message ?? server?.fieldError('login_id')}
          {...register('login_id', { required: 'Enter your login ID.' })}
        />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message ?? server?.fieldError('password')}
          {...register('password', { required: 'Enter your password.' })}
        />
        <Button type="submit" icon={LogIn} disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
