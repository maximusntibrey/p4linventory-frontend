import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LoginOutlined from '@ant-design/icons/LoginOutlined';
import { api, ApiError } from '../api';
import { fetchMe, meKey, useMe } from '../auth/session';
import { AuthLayout } from '../components/AuthLayout';
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
  } = useForm<Values>({ shouldFocusError: false }); // the error summary owns focus
  const [failure, setFailure] = useState<{ error: unknown; n: number }>();
  const [invalidN, setInvalidN] = useState(0);

  const login = useMutation({
    mutationFn: (v: Values) =>
      api('post', '/api/v1/auth/login/', {
        body: { login_id: v.login_id.trim(), password: v.password },
      }),
    meta: { keepSession: true },
    gcTime: 0, // the password must not linger in the mutation cache
    onSuccess: async (data) => {
      qc.clear(); // a new sign-in must never see data cached for the previous user
      // /me is the one source for who must pick a branch and what the menu is: ask it again rather
      // than trust the sign-in answer. If that call fails, the sign-in answer is still used.
      const fresh = await fetchMe().catch(() => undefined);
      // 401 right after signing in: the session did not hold. Stay here; do not use the sign-in answer.
      if (fresh === null) {
        throw new ApiError(
          401,
          'unauthenticated',
          'session_not_held',
          'Your sign-in did not hold, try again.',
        );
      }
      qc.setQueryData(meKey, fresh ?? data);
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
        <Typography role="status" variant="subtitle1" component="p">
          Your session has ended. Sign in again.
        </Typography>
      )}
      {summary && <ErrorSummary key={summary.n} title={summary.title} items={summary.items} />}
      <Stack
        component="form"
        noValidate
        sx={{ gap: 2 }}
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
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          startIcon={<LoginOutlined aria-hidden />}
          disabled={login.isPending}
        >
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </Stack>
    </AuthLayout>
  );
}
