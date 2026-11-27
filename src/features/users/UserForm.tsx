import { useForm } from 'react-hook-form';
import Box from '@mui/material/Box';
import { useQuery } from '@tanstack/react-query';
import { Save } from 'components/icons';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import { roleCodes, roleLabels } from './labels';
import { Button, SelectField, TextField, CheckField } from '../../components/ui';

type S = components['schemas'];
type Values = {
  full_name: string;
  role: S['RoleCode'] | '';
  roles: S['RoleCode'][];
  location: string;
};

export type UserFormBody = {
  full_name: string;
  roles?: S['RoleCode'][];
  permanent_location_id?: number | null;
};

type Props = {
  /** Present when editing. */
  user?: S['User'];
  pending: boolean;
  error: unknown;
  onSubmit: (body: UserFormBody) => void;
  submitLabel: string;
};

/**
 * Name, role(s) and permanent location. Several roles are offered only when /me says
 * can_assign_multiple_roles; otherwise one role, and a user who already has several keeps them
 * (the roles are not sent).
 */
export function UserForm({ user, pending, error, onSubmit, submitLabel }: Props) {
  const canMulti = useCurrentMe().can_assign_multiple_roles;
  const multiRole = !canMulti && (user?.roles.length ?? 0) > 1;
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    defaultValues: {
      full_name: user?.full_name ?? '',
      role: user?.roles[0] ?? '',
      roles: user?.roles ?? [],
      location: user?.permanent_location_id?.toString() ?? '',
    },
  });
  const locations = useQuery({
    queryKey: ['branches', 'locations'],
    queryFn: () => api('get', '/api/v1/branches/', { query: { is_active: true, page_size: 100 } }),
  });
  const server = error instanceof ApiError ? error : undefined;
  const roleError =
    (canMulti ? errors.roles?.message : errors.role?.message) ?? server?.fieldError('roles');

  return (
    <Box
      component="form"
      noValidate
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
      onSubmit={(e) =>
        void handleSubmit((v) => {
          const location = v.location === '' ? undefined : Number(v.location);
          onSubmit({
            full_name: v.full_name.trim(),
            ...(canMulti
              ? { roles: v.roles }
              : multiRole || v.role === ''
                ? {}
                : { roles: [v.role] }),
            // Editing may clear the location (null); creating simply leaves it out.
            ...(location !== undefined
              ? { permanent_location_id: location }
              : user
                ? { permanent_location_id: null }
                : {}),
          });
        })(e)
      }
    >
      <TextField
        label="Full name"
        autoComplete="off"
        error={errors.full_name?.message ?? server?.fieldError('full_name')}
        {...register('full_name', { required: 'Enter the full name.' })}
      />
      {multiRole ? (
        <Box component="p" sx={{ m: 0 }}>
          <Box component="span" sx={{ fontWeight: 600 }}>
            Roles:{' '}
          </Box>
          {user?.roles.map((r) => roleLabels[r]).join(', ')}
        </Box>
      ) : (
        <Box
          component="fieldset"
          sx={{ m: 0, display: 'flex', flexDirection: 'column', gap: 0.5, border: 0, p: 0 }}
        >
          <Box component="legend" sx={{ mb: 0.5, p: 0, fontWeight: 600 }}>
            {canMulti ? 'Roles' : 'Role'}
          </Box>
          {roleCodes.map((code) => (
            <CheckField
              key={code}
              label={roleLabels[code]}
              type={canMulti ? 'checkbox' : 'radio'}
              value={code}
              {...(canMulti
                ? register('roles', {
                    validate: (v) => (v && v.length > 0) || 'Choose at least one role.',
                  })
                : register('role', { required: 'Choose a role.' }))}
            />
          ))}
          {roleError && (
            <Box
              component="p"
              sx={{ m: 0, fontSize: '0.875rem', fontWeight: 600, color: 'error.main' }}
              role="alert"
            >
              {roleError}
            </Box>
          )}
        </Box>
      )}
      <SelectField
        key={locations.isSuccess ? 'ready' : 'loading'} // remount so the saved value is selected once the options exist
        label="Permanent location"
        error={server?.fieldError('permanent_location_id')}
        {...register('location')}
      >
        <option value="">None</option>
        {(locations.data ? rowsOf(locations.data) : []).map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </SelectField>
      <Button type="submit" icon={Save} disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </Box>
  );
}
