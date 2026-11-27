import { useState } from 'react';
import Box from '@mui/material/Box';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'components/icons';
import { api } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey } from '../../api/idempotency';
import { ApiProblem } from '../../components/ApiProblem';
import { OneTimePassword } from './OneTimePassword';
import { UserForm } from './UserForm';
import { Card, PageHeader } from '../../components/ui';

type Created = components['schemas']['UserWithOneTimePassword'];

export function UserNew() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  // Component state only: leaving the screen drops the password.
  const [created, setCreated] = useState<Created>();
  const create = useMutation({
    mutationFn: (body: components['schemas']['UserCreate']) =>
      api('post', '/api/v1/users/', {
        body,
        idempotencyKey: keys.forAction(JSON.stringify(body)),
      }),
    gcTime: 0, // the one-time password must not linger in the mutation cache
  });
  const submit = (body: components['schemas']['UserCreate']) =>
    create.mutate(body, {
      onSuccess: async (u) => {
        keys.done();
        setCreated(u);
        create.reset(); // the mutation hook must not keep the password either
        await qc.invalidateQueries({ queryKey: ['users'] });
      },
    });

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title={created ? 'User created' : 'Add a user'} />
      {created ? (
        <>
          <Box component="p" role="status" sx={{ m: 0, fontWeight: 600 }}>
            {created.full_name} was created. Their login ID is {created.login_id}.
          </Box>
          <OneTimePassword
            loginId={created.login_id}
            password={created.one_time_password}
            expiresAt={created.one_time_password_expires_at}
            onDone={() => {
              setCreated(undefined);
              navigate('/users');
            }}
          />
        </>
      ) : (
        <>
          <ApiProblem error={create.error} at={create.submittedAt} />
          <Card>
            <UserForm
              pending={create.isPending}
              error={create.error}
              submitLabel="Create user"
              onSubmit={(b) =>
                submit({
                  full_name: b.full_name,
                  roles: b.roles ?? [],
                  ...(b.permanent_location_id
                    ? { permanent_location_id: b.permanent_location_id }
                    : {}),
                })
              }
            />
          </Card>
          <Box
            component={Link}
            to="/users"
            sx={{
              display: 'inline-flex',
              minHeight: 44,
              alignItems: 'center',
              gap: 1,
              fontWeight: 600,
              color: 'primary.main',
              textDecoration: 'underline',
            }}
          >
            <ArrowLeft aria-hidden="true" size={20} />
            <span>Back to users</span>
          </Box>
        </>
      )}
    </Box>
  );
}
