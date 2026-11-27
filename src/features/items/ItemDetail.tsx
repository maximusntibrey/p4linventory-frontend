import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, CheckCircle2, Ban } from 'lucide-react';
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
import { Button, Card, StatusWord } from '../../components/ui';

type S = components['schemas'];
type Warning = S['ItemWithCostAndWarnings']['warnings'][number];
type Shown = S['Item'] | S['ItemWithCost'];

function Warnings({ list }: { list: Warning[] }) {
  if (list.length === 0) return null;
  return (
    <div role="status" className="rounded-lg border border-warn bg-warn-bg p-3 text-warn">
      <p className="m-0 flex items-center gap-2 font-semibold">
        <AlertTriangle aria-hidden="true" size={20} />
        <span>This item may already exist. It was still saved.</span>
      </p>
      <ul className="m-0 mt-1 list-disc pl-10 text-sm">
        {list.map((w, i) => (
          <li key={i}>
            {w.message}{' '}
            <Link to={`/items/${w.item_id}`} className="font-semibold underline">
              Open that item
            </Link>
          </li>
        ))}
      </ul>
    </div>
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
      <div className="flex flex-col gap-2">
        <h1 className="text-display">{item.name}</h1>
        <p className="m-0 flex flex-wrap items-center gap-2 text-muted">
          <span>{item.sku}</span>
          <span aria-hidden="true">·</span>
          <span>{item.brand_name ?? 'No brand'}</span>
          <StatusWord status={badge.status} label={badge.label} />
        </p>
      </div>
      {notice && <SuccessNotice>{notice}</SuccessNotice>}
      <Warnings list={warnings} />
      <Card className="flex flex-col gap-1">
        <h2 className="text-title">Summary</h2>
        <p className="m-0">
          {item.model_name} · {item.mpn} · {conditionLabels[item.condition]}
          {item.grade ? ` · Grade ${item.grade}` : ''}
        </p>
        <p className="m-0 font-semibold">
          {item.selling_price ? ghs(item.selling_price) : 'No selling price yet'}
        </p>
        {withCost && averageCost(item) !== undefined && (
          <p className="m-0 text-muted">Average cost: {costText(averageCost(item) ?? null)}</p>
        )}
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-title">Picture</h2>
        <ImageUpload item={item} canManage={canManage} onUploaded={remember} />
      </Card>
      {canManage && (
        <>
          <Card className="flex flex-col gap-3">
            <h2 className="text-title">Details</h2>
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
          <Card className="flex flex-col gap-3">
            <h2 className="text-title">Status</h2>
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
              <div className="flex flex-wrap gap-2">
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
              </div>
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
    <div className="flex flex-col gap-4">
      <QueryGate query={detail}>
        {(item) => (
          <Detail
            item={item}
            withCost={withCost}
            canManage={me.permissions.includes('items.manage')}
          />
        )}
      </QueryGate>
      <Link
        to="/items"
        className="inline-flex min-h-11 items-center gap-2 font-semibold text-primary-solid underline"
      >
        <ArrowLeft aria-hidden="true" size={20} />
        <span>Back to items</span>
      </Link>
    </div>
  );
}
