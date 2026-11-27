import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import KeyOutlined from '@ant-design/icons/KeyOutlined';
import LogoutOutlined from '@ant-design/icons/LogoutOutlined';
import { api, ApiError } from '../api';
import { meKey, useLogout } from '../auth/session';
import { AuthLayout } from '../components/AuthLayout';
import { describeError, ErrorSummary } from '../components/ErrorSummary';
import type { ErrorParts } from '../components/ErrorSummary';
import { Field } from '../components/Field';
import MainCard from 'components/MainCard';
import { PageHeader } from '../components/ui';

type Values = { current_password: string; new_password: string; confirm: string };

/** Change own password. `forced` is the first-login screen (C5): it stands alone and the only other way out is Log out. */
export function ChangePassword({ forced = false }: { forced?: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<Values>({ shouldFocusError: false }); // the error summary owns focus
  const [failure, setFailure] = useState<{ error: unknown; n: number }>();
  const [invalidN, setInvalidN] = useState(0);
  const [done, setDone] = useState(false);
  const out = useLogout(() => navigate('/login', { replace: true }));

  const change = useMutation({
    mutationFn: (v: Values) =>
      api('post', '/api/v1/auth/password/', {
        body: { current_password: v.current_password, new_password: v.new_password },
      }),
    gcTime: 0, // passwords must not linger in the mutation cache
    onSuccess: async () => {
      reset();
      setDone(true);
      // Forced: the refreshed session no longer says "must change", so the guard opens the app.
      await qc.invalidateQueries({ queryKey: meKey });
    },
    onError: (error) => setFailure((f) => ({ error, n: (f?.n ?? 0) + 1 })),
  });

  const server = failure?.error instanceof ApiError ? failure.error : undefined;
  const clientMessages = Object.values(errors).flatMap((e) => (e?.message ? [e.message] : []));
  const summary: (ErrorParts & { n: string }) | undefined = failure
    ? { ...describeError(failure.error), n: `s${failure.n}` }
    : clientMessages.length
      ? { title: 'Check the highlighted fields.', items: clientMessages, n: `c${invalidN}` }
      : undefined;

  const body = (
    <>
      {forced && (
        <Typography color="text.secondary">
          You signed in with a one-time password. Choose your own password to continue.
        </Typography>
      )}
      {done && !forced && (
        <Typography role="status" variant="subtitle1" component="p" color="success.dark">
          Your password was changed.
        </Typography>
      )}
      {summary && <ErrorSummary key={summary.n} title={summary.title} items={summary.items} />}
      <Stack
        component="form"
        noValidate
        sx={{ gap: 2 }}
        onSubmit={(e) => {
          setFailure(undefined);
          setDone(false);
          void handleSubmit(
            (v) => change.mutate(v),
            () => setInvalidN((n) => n + 1),
          )(e);
        }}
      >
        <Field
          label={forced ? 'One-time password' : 'Current password'}
          type="password"
          autoComplete="current-password"
          error={errors.current_password?.message ?? server?.fieldError('current_password')}
          {...register('current_password', { required: 'Enter your current password.' })}
        />
        <Field
          label="New password"
          type="password"
          hint="At least 10 characters."
          autoComplete="new-password"
          error={errors.new_password?.message ?? server?.fieldError('new_password')}
          {...register('new_password', { required: 'Enter a new password.' })}
        />
        <Field
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirm?.message}
          {...register('confirm', {
            required: 'Type the new password again.',
            validate: (v) =>
              v === getValues('new_password') || 'The two new passwords do not match.',
          })}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          startIcon={<KeyOutlined aria-hidden />}
          disabled={change.isPending}
        >
          {change.isPending ? 'Saving…' : 'Save new password'}
        </Button>
      </Stack>
      {forced && (
        <>
          {out.error && (
            <Typography role="alert" variant="subtitle1" component="p" color="error.main">
              {out.error}
            </Typography>
          )}
          <Button
            variant="outlined"
            color="secondary"
            size="large"
            fullWidth
            startIcon={<LogoutOutlined aria-hidden />}
            onClick={out.logout}
            disabled={out.pending}
          >
            Log out
          </Button>
        </>
      )}
    </>
  );

  return forced ? (
    <AuthLayout title="Choose a new password">{body}</AuthLayout>
  ) : (
    <div className="flex flex-col gap-4">
      <PageHeader title="Change password" />
      <MainCard sx={{ maxWidth: 480 }}>{body}</MainCard>
    </div>
  );
}
