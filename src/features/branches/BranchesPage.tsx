import { useState } from 'react';
import Box from '@mui/material/Box';
import { Controller, useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, PowerOff, Save, Store } from 'components/icons';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey } from '../../api/idempotency';
import { useCurrentMe } from '../../auth/guards';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { describeError } from '../../components/ErrorSummary';
import { SuccessNotice, useReturnFocus } from '../../components/focus';
import {
  Button,
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  SegmentedControl,
  StatusWord,
  TextField,
  Toolbar,
} from '../../components/ui';
import type { Column } from '../../components/ui';
import { Forbidden } from '../../pages/Forbidden';
import { BranchTypeBadge, BRANCH_TYPE_OPTIONS } from './BranchType';

type Branch = components['schemas']['Branch'];
type BranchType = Branch['branch_type'];
type TypeFilter = BranchType | 'all';
type Values = { code: string; name: string; branch_type: BranchType | '' };

function BranchForm({ branch, onClose }: { branch?: Branch; onClose: (saved: boolean) => void }) {
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  useReturnFocus();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    defaultValues: {
      code: branch?.code ?? '',
      name: branch?.name ?? '',
      branch_type: branch?.branch_type ?? '',
    },
  });
  const save = useMutation({
    mutationFn: (v: Values) => {
      // The type is required in the form, so a value is always chosen here.
      const body = { code: v.code, name: v.name, branch_type: v.branch_type as BranchType };
      const idempotencyKey = keys.forAction(`${branch?.id ?? 'new'}:${JSON.stringify(body)}`);
      return branch
        ? api('patch', '/api/v1/branches/{id}/', { path: { id: branch.id }, body, idempotencyKey })
        : api('post', '/api/v1/branches/', { body, idempotencyKey });
    },
    onSuccess: async () => {
      keys.done();
      await qc.invalidateQueries({ queryKey: ['branches'] });
      onClose(true);
    },
  });
  const server = save.error instanceof ApiError ? save.error : undefined;
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box component="h2" sx={{ typography: 'h4' }}>
        {branch ? `Edit ${branch.name}` : 'Add a branch'}
      </Box>
      <ApiProblem error={save.error} at={save.submittedAt} />
      <Box
        component="form"
        noValidate
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        onSubmit={(e) => void handleSubmit((v) => save.mutate(v))(e)}
      >
        <TextField
          label="Code"
          hint="A short code, for example ACC."
          autoComplete="off"
          error={errors.code?.message ?? server?.fieldError('code')}
          {...register('code', { required: 'Enter a code.' })}
        />
        <TextField
          label="Name"
          autoComplete="off"
          error={errors.name?.message ?? server?.fieldError('name')}
          {...register('name', { required: 'Enter a name.' })}
        />
        <Controller
          control={control}
          name="branch_type"
          rules={{ required: 'Choose a branch type.' }}
          render={({ field }) => (
            <SegmentedControl<BranchType | ''>
              variant="cards"
              label="Branch Type"
              legend="Branch Type"
              required
              value={field.value}
              onValueChange={field.onChange}
              options={BRANCH_TYPE_OPTIONS}
              error={errors.branch_type?.message ?? server?.fieldError('branch_type')}
            />
          )}
        />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button type="submit" icon={Save} disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save branch'}
          </Button>
          <Button variant="secondary" onClick={() => onClose(false)} disabled={save.isPending}>
            Cancel
          </Button>
        </Box>
      </Box>
    </Card>
  );
}

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'All types' },
  { value: 'branch', label: 'Normal Branch' },
  { value: 'warehouse', label: 'Warehouse' },
];

export function BranchesPage() {
  const canManage = useCurrentMe().permissions.includes('branches.manage');
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const [page, setPage] = useState(1);
  const [type, setType] = useState<TypeFilter>('all');
  const [form, setForm] = useState<Branch | 'new' | null>(null);
  const [confirm, setConfirm] = useState<Branch | null>(null);
  const [notice, setNotice] = useState<string>();
  const list = useQuery({
    queryKey: ['branches', 'list', page, type],
    queryFn: () =>
      api('get', '/api/v1/branches/', {
        query: { page, branch_type: type === 'all' ? undefined : type },
      }),
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

  const columns: Column<Branch>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (b) => (
        <Box component="span" sx={{ fontWeight: 600 }}>
          {b.name}
        </Box>
      ),
    },
    { id: 'code', header: 'Code', cell: (b) => b.code },
    { id: 'type', header: 'Type', cell: (b) => <BranchTypeBadge type={b.branch_type} /> },
    {
      id: 'status',
      header: 'Status',
      cell: (b) => <StatusWord status={b.is_active ? 'active' : 'deactivated'} />,
    },
    ...(canManage
      ? [
          {
            id: 'actions',
            header: 'Actions',
            cell: (b: Branch) => (
              <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
              </Box>
            ),
          },
        ]
      : []),
  ];

  if (list.error instanceof ApiError && list.error.kind === 'forbidden') return <Forbidden />;
  const data = list.data;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Branches"
        subtitle="Normal branches and the warehouse."
        actions={
          canManage &&
          !form && (
            <Button
              icon={Plus}
              onClick={() => {
                setNotice(undefined);
                setForm('new');
              }}
            >
              Add a branch
            </Button>
          )
        }
      />
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
      {confirm && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <ApiProblem error={toggle.error} at={toggle.submittedAt} />
          <ConfirmPanel
            title={`Deactivate ${confirm.name}? Its history is kept.`}
            confirmLabel="Yes, deactivate"
            pending={toggle.isPending}
            onConfirm={() => toggle.mutate({ branch: confirm, activate: false })}
            onCancel={() => setConfirm(null)}
          />
        </Box>
      )}
      <Toolbar
        view={{
          label: 'Type',
          value: type,
          options: TYPE_FILTERS,
          onChange: (v) => {
            setType(v);
            setPage(1);
          },
        }}
      />
      <DataTable
        caption="Branches"
        columns={columns}
        rows={data ? rowsOf(data) : []}
        rowKey={(b) => String(b.id)}
        state={list.isPending ? 'loading' : list.isError ? 'error' : 'ready'}
        errorMessage={list.isError ? describeError(list.error).title : undefined}
        onRetry={() => void list.refetch()}
        empty={
          <EmptyState
            icon={Store}
            title="No branches"
            description={type === 'all' ? 'Nothing here yet.' : 'No location of this type.'}
          />
        }
        pagination={
          data && data.count > data.page_size
            ? {
                page: data.page,
                pageCount: Math.ceil(data.count / data.page_size),
                onPageChange: setPage,
              }
            : undefined
        }
      />
    </Box>
  );
}
