import { useState } from 'react';
import Box from '@mui/material/Box';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, Ban } from 'components/icons';
import { api } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey } from '../../api/idempotency';
import { useCurrentMe } from '../../auth/guards';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { SuccessNotice } from '../../components/focus';
import { QueryGate } from '../../components/QueryGate';
import { ImageUpload } from './ImageUpload';
import { ItemForm } from './ItemForm';
import {
  averageCost,
  conditionLabels,
  costText,
  ghs,
  itemStatusBadge,
  withoutCost,
} from './labels';
import { Button, Card, PageHeader, StatusWord } from '../../components/ui';

type S = components['schemas'];
type Warning = S['ItemWithCostAndWarnings']['warnings'][number];
type Shown = S['Item'] | S['ItemWithCost'];

function Warnings({ list }: { list: Warning[] }) {
  if (list.length === 0) return null;
  return (
    <Box
      role="status"
      sx={{
        borderRadius: 1,
        border: '1px solid',
        borderColor: 'warning.main',
        bgcolor: 'warning.lighter',
        p: 1.5,
        color: 'warning.main',
      }}
    >
      <Box
        component="p"
        sx={{ m: 0, display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}
      >
        <AlertTriangle aria-hidden="true" size={20} />
        <span>This item may already exist. It was still saved.</span>
      </Box>
      <Box component="ul" sx={{ m: 0, mt: 0.5, listStyle: 'disc', pl: 5, fontSize: '0.875rem' }}>
        {list.map((w, i) => (
          <li key={i}>
            {w.message}{' '}
            <Box
              component={Link}
              to={`/items/${w.item_id}`}
              sx={{ fontWeight: 600, textDecoration: 'underline' }}
            >
              Open that item
            </Box>
          </li>
        ))}
      </Box>
    </Box>
  );
}

function Detail({
  item,
  withCost,
  canManage,
}: {
  item: Shown;
  withCost: boolean;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const from = useLocation().state as { notice?: string; warnings?: Warning[] } | null;
  const [notice, setNotice] = useState(from?.notice);
  const [warnings, setWarnings] = useState<Warning[]>(from?.warnings ?? []);
  const [confirm, setConfirm] = useState(false);
  const editKeys = useIdempotencyKey();
  const statusKeys = useIdempotencyKey();
  const remember = (row: S['ItemWithCost']) => {
    qc.setQueryData(['items', 'one', item.id, withCost], withCost ? row : withoutCost(row));
    void qc.invalidateQueries({ queryKey: ['items', 'list'] });
  };
  const edit = useMutation({
    mutationFn: (body: S['ItemWrite']) =>
      api('patch', '/api/v1/items/{id}/', {
        path: { id: item.id },
        body,
        idempotencyKey: editKeys.forAction(JSON.stringify(body)),
      }),
    onSuccess: ({ warnings: w, ...row }) => {
      editKeys.done();
      setNotice('Changes saved.');
      setWarnings(w);
      remember(row);
    },
  });
  const move = useMutation({
    mutationFn: (to: 'active' | 'discontinued') =>
      api('post', '/api/v1/items/{id}/status/', {
        path: { id: item.id },
        body: { status: to },
        idempotencyKey: statusKeys.forAction(to),
      }),
    onSuccess: (row) => {
      statusKeys.done();
      setConfirm(false);
      setWarnings([]);
      setNotice(`${row.name} is now ${itemStatusBadge[row.status].label}.`);
      remember(row);
    },
  });
  const badge = itemStatusBadge[item.status];

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <PageHeader title={item.name} />
        <Box
          component="p"
          sx={{
            m: 0,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1,
            color: 'text.secondary',
          }}
        >
          <span>{item.sku}</span>
          <span aria-hidden="true">·</span>
          <span>{item.brand_name ?? 'No brand'}</span>
          <StatusWord status={badge.status} label={badge.label} />
        </Box>
      </Box>
      {notice && <SuccessNotice>{notice}</SuccessNotice>}
      <Warnings list={warnings} />
      <Card sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box component="h2" sx={{ typography: 'h4' }}>
          Summary
        </Box>
        <Box component="p" sx={{ m: 0 }}>
          {item.model_name} · {item.mpn} · {conditionLabels[item.condition]}
          {item.grade ? ` · Grade ${item.grade}` : ''}
        </Box>
        <Box component="p" sx={{ m: 0, fontWeight: 600 }}>
          {item.selling_price ? ghs(item.selling_price) : 'No selling price yet'}
        </Box>
        {withCost && averageCost(item) !== undefined && (
          <Box component="p" sx={{ m: 0, color: 'text.secondary' }}>
            Average cost: {costText(averageCost(item) ?? null)}
          </Box>
        )}
      </Card>
      <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box component="h2" sx={{ typography: 'h4' }}>
          Picture
        </Box>
        <ImageUpload item={item} canManage={canManage} onUploaded={remember} />
      </Card>
      {canManage && (
        <>
          <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box component="h2" sx={{ typography: 'h4' }}>
              Details
            </Box>
            <ApiProblem error={edit.error} at={edit.submittedAt} />
            <ItemForm
              key={`${item.id}|${item.updated_at}`}
              item={item}
              pending={edit.isPending}
              error={edit.error}
              submitLabel="Save changes"
              onSubmit={(body) => {
                setNotice(undefined);
                edit.mutate(body);
              }}
            />
          </Card>
          <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box component="h2" sx={{ typography: 'h4' }}>
              Status
            </Box>
            <ApiProblem error={move.error} at={move.submittedAt} />
            {confirm ? (
              <ConfirmPanel
                title={`Discontinue ${item.name}? A discontinued item cannot be made active again.`}
                confirmLabel="Discontinue item"
                pending={move.isPending}
                onConfirm={() => move.mutate('discontinued')}
                onCancel={() => {
                  setConfirm(false);
                  move.reset();
                }}
              />
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {item.status === 'draft' && (
                  <Button
                    icon={CheckCircle2}
                    disabled={move.isPending}
                    onClick={() => {
                      setNotice(undefined);
                      move.mutate('active');
                    }}
                  >
                    {move.isPending ? 'Working…' : 'Activate item'}
                  </Button>
                )}
                {item.status === 'active' && (
                  <Button
                    variant="danger"
                    icon={Ban}
                    onClick={() => {
                      setNotice(undefined);
                      move.reset();
                      setConfirm(true);
                    }}
                  >
                    Discontinue item
                  </Button>
                )}
              </Box>
            )}
          </Card>
        </>
      )}
    </>
  );
}

export function ItemDetail() {
  const id = Number(useParams().id);
  const me = useCurrentMe();
  const withCost = me.permissions.includes('items.view_cost');
  const detail = useQuery({
    queryKey: ['items', 'one', id, withCost],
    queryFn: () =>
      withCost
        ? api('get', '/api/v1/costed-items/{id}/', { path: { id } })
        : api('get', '/api/v1/items/{id}/', { path: { id } }),
  });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <QueryGate query={detail}>
        {(item) => (
          <Detail
            item={item}
            withCost={withCost}
            canManage={me.permissions.includes('items.manage')}
          />
        )}
      </QueryGate>
      <Box
        component={Link}
        to="/items"
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
        <span>Back to items</span>
      </Box>
    </Box>
  );
}
