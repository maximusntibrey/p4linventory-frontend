import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, ShoppingCart } from 'lucide-react';
import { api, rowsOf } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import type { components } from '../../api';
import { useIdempotencyKey, useSingleFlight } from '../../api/idempotency';
import { ApiProblem } from '../../components/ApiProblem';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { SuccessNotice } from '../../components/focus';
import { Field } from '../../components/Field';
import { Pager } from '../../components/Pager';
import { QueryGate } from '../../components/QueryGate';
import { Select } from '../../components/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { formatAccra } from '../../lib/time';
import { ghs } from '../items/labels';
import { linkButton, paymentCodes, paymentLabel, saleStatusLabels } from './labels';

type S = components['schemas'];

function StatusOf({ status }: { status: S['SaleStatus'] }) {
  if (status === 'completed') return <StatusBadge status="completed" />;
  if (status === 'cancelled') return <StatusBadge status="cancelled" />;
  return <span className="font-semibold">{saleStatusLabels[status]}</span>;
}

/** Sales at the branch the API lets this user see. Cancel is offered on completed sales; the server decides who may and answers 403 or 404 otherwise. */
export function SalesPage() {
  const canCancel = useCurrentMe().permissions.includes('sales.cancel');
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const flight = useSingleFlight();
  const [filters, setFilters] = useState({ status: '', payment: '' });
  const [page, setPage] = useState(1);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string>();
  const [notice, setNotice] = useState<{ text: string; at: number } | null>(null);
  const list = useQuery({
    placeholderData: (prev) => prev,
    queryKey: ['sales', 'list', filters, page],
    queryFn: () =>
      api('get', '/api/v1/sales/', {
        query: {
          page,
          status: (filters.status || undefined) as S['SaleStatus'] | undefined,
          payment_method: (filters.payment || undefined) as S['PaymentMethodCode'] | undefined,
        },
      }),
  });
  const cancel = useMutation({
    mutationFn: (v: { id: number; reason: string }) =>
      api('post', '/api/v1/sales/{id}/cancel/', {
        path: { id: v.id },
        body: { reason: v.reason },
        idempotencyKey: keys.forAction(`${v.id}:${v.reason}`),
      }),
    onSuccess: async (sale) => {
      keys.done();
      // The opener disappears with the Completed status, so the result takes focus instead of the page top.
      setNotice({ text: `Sale ${sale.reference} is cancelled.`, at: Date.now() });
      setCancelling(null);
      setReason('');
      await qc.invalidateQueries({ queryKey: ['sales'] });
      await qc.invalidateQueries({ queryKey: ['stock'] });
    },
  });
  const close = () => {
    setCancelling(null);
    setReason('');
    setReasonError(undefined);
    cancel.reset();
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-4xl text-ink">Sales</h1>
        <Link to="/sell" className={linkButton}>
          <ShoppingCart aria-hidden="true" size={20} />
          <span>New sale</span>
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Status"
          value={filters.status}
          onChange={(e) => {
            setFilters({ ...filters, status: e.target.value });
            setPage(1);
          }}
        >
          <option value="">All</option>
          <option value="completed">{saleStatusLabels.completed}</option>
          <option value="cancelled">{saleStatusLabels.cancelled}</option>
        </Select>
        <Select
          label="Payment method"
          value={filters.payment}
          onChange={(e) => {
            setFilters({ ...filters, payment: e.target.value });
            setPage(1);
          }}
        >
          <option value="">All</option>
          {paymentCodes.map((c) => (
            <option key={c} value={c}>
              {paymentLabel(c)}
            </option>
          ))}
        </Select>
      </div>
      {notice && <SuccessNotice key={notice.at}>{notice.text}</SuccessNotice>}
      {!cancelling && <ApiProblem error={cancel.error} at={cancel.submittedAt} />}
      <QueryGate query={list}>
        {(data) => {
          const rows = rowsOf(data);
          return (
            <>
              {rows.length === 0 && <p className="m-0 text-muted">No sales match.</p>}
              <ul className="m-0 grid list-none gap-3 p-0">
                {rows.map((s) => (
                  <li key={s.id}>
                    <Card className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="text-2xl">{s.reference}</h2>
                        <StatusOf status={s.status} />
                      </div>
                      <p className="m-0 text-sm text-muted">
                        {s.location.name} · {formatAccra(s.sold_at)} · {s.staff} ·{' '}
                        {paymentLabel(s.payment_method)}
                      </p>
                      <ul className="m-0 list-none p-0">
                        {s.lines.map((l) => (
                          <li key={l.id}>
                            {l.quantity} × {l.item_name} at {ghs(l.unit_price)}
                          </li>
                        ))}
                      </ul>
                      <p className="m-0 text-lg font-semibold">Total {ghs(s.total)}</p>
                      {s.cancellation && (
                        <p className="m-0 text-sm">
                          Cancelled by {s.cancellation.cancelled_by} on{' '}
                          {formatAccra(s.cancellation.cancelled_at)}. Reason:{' '}
                          {s.cancellation.reason}
                        </p>
                      )}
                      {canCancel && s.status === 'completed' && (
                        <Button
                          variant="danger"
                          icon={Ban}
                          aria-label={`Cancel sale ${s.reference}`}
                          aria-expanded={cancelling === s.id}
                          className="self-start"
                          onClick={() => {
                            cancel.reset();
                            setReason('');
                            setReasonError(undefined);
                            setNotice(null);
                            setCancelling(s.id);
                          }}
                        >
                          Cancel sale
                        </Button>
                      )}
                      {cancelling === s.id && (
                        <>
                          <ApiProblem error={cancel.error} at={cancel.submittedAt} />
                          <ConfirmPanel
                            title={`Cancel sale ${s.reference}? The stock goes back and the sale stays on record as Cancelled.`}
                            confirmLabel="Cancel this sale"
                            pending={cancel.isPending}
                            onConfirm={() => {
                              if (!reason.trim()) {
                                setReasonError('Give a reason for cancelling.');
                                return;
                              }
                              setReasonError(undefined);
                              if (flight.start())
                                cancel.mutate(
                                  { id: s.id, reason: reason.trim() },
                                  { onSettled: flight.end },
                                );
                            }}
                            onCancel={close}
                          >
                            <Field
                              label="Reason"
                              value={reason}
                              maxLength={1000}
                              autoComplete="off"
                              onChange={(e) => setReason(e.target.value)}
                              error={reasonError}
                            />
                          </ConfirmPanel>
                        </>
                      )}
                    </Card>
                  </li>
                ))}
              </ul>
              <Pager page={data} onPage={setPage} />
            </>
          );
        }}
      </QueryGate>
    </div>
  );
}
