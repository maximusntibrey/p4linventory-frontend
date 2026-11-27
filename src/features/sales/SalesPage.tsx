import { useState } from 'react';
import Box from '@mui/material/Box';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, ShoppingCart } from 'components/icons';
import { api, ApiError, rowsOf } from '../../api';
import { useCurrentMe } from '../../auth/guards';
import type { components } from '../../api';
import { useIdempotencyKey, useSingleFlight } from '../../api/idempotency';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { SuccessNotice } from '../../components/focus';
import { describeError } from '../../components/ErrorSummary';
import { Forbidden } from '../../pages/Forbidden';
import { formatAccra } from '../../lib/time';
import { ghs } from '../items/labels';
import { paymentCodes, paymentLabel, saleStatusLabels } from './labels';
import {
  Button,
  DataTable,
  EmptyState,
  LinkButton,
  PageHeader,
  SelectField,
  Toolbar,
  StatusWord,
  TextField,
} from '../../components/ui';
import type { Column } from '../../components/ui';

type S = components['schemas'];
type Sale = S['Sale'];

function StatusOf({ status }: { status: S['SaleStatus'] }) {
  if (status === 'completed') return <StatusWord status="completed" />;
  if (status === 'cancelled') return <StatusWord status="cancelled" />;
  return (
    <Box component="span" sx={{ fontWeight: 600 }}>
      {saleStatusLabels[status]}
    </Box>
  );
}

/** Sales at the branch the API lets this user see. Cancel is offered on completed sales; the server decides who may and answers 403 or 404 otherwise. */
import { useBranchFilter } from '../workingBranch/BranchFilter';
import { BranchScope } from '../workingBranch/BranchScope';

export function SalesPage() {
  const { branch } = useBranchFilter();
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
    queryKey: ['sales', 'list', filters, page, branch],
    queryFn: () =>
      api('get', '/api/v1/sales/', {
        query: {
          page,
          branch,
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

  const data = list.data;
  if (list.error instanceof ApiError && list.error.kind === 'forbidden') return <Forbidden />;
  const cancelled =
    cancelling === null ? undefined : (data ? rowsOf(data) : []).find((x) => x.id === cancelling);
  const columns: Column<Sale>[] = [
    {
      id: 'ref',
      header: 'Reference',
      cell: (s) => (
        <Box component="span" sx={{ fontWeight: 600 }}>
          {s.reference}
        </Box>
      ),
    },
    {
      id: 'details',
      header: 'Details',
      cell: (s) => (
        <Box component="span" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
          {s.location.name} · {formatAccra(s.sold_at)} · {s.staff} ·{' '}
          {paymentLabel(s.payment_method)}
        </Box>
      ),
    },
    {
      id: 'items',
      header: 'Items',
      cell: (s) => (
        <Box component="span" sx={{ display: 'flex', flexDirection: 'column' }}>
          {s.lines.map((l) => (
            <span key={l.id}>
              {l.quantity} × {l.item_name} at {ghs(l.unit_price)}
            </span>
          ))}
        </Box>
      ),
    },
    {
      id: 'total',
      header: 'Total',
      align: 'right',
      cell: (s) => (
        <Box component="span" sx={{ fontWeight: 600 }}>
          Total {ghs(s.total)}
        </Box>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (s) => (
        <Box
          component="span"
          sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.5 }}
        >
          <StatusOf status={s.status} />
          {s.cancellation && (
            <Box component="span" sx={{ fontSize: '0.875rem' }}>
              Cancelled by {s.cancellation.cancelled_by} on{' '}
              {formatAccra(s.cancellation.cancelled_at)}. Reason: {s.cancellation.reason}
            </Box>
          )}
        </Box>
      ),
    },
    ...(canCancel
      ? [
          {
            id: 'actions',
            header: 'Actions',
            cell: (s: Sale) =>
              s.status === 'completed' ? (
                <Button
                  variant="danger"
                  icon={Ban}
                  aria-label={`Cancel sale ${s.reference}`}
                  aria-expanded={cancelling === s.id}
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
              ) : null,
          },
        ]
      : []),
  ];
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader
        title="Sales"
        actions={
          <LinkButton to="/sell" icon={ShoppingCart} variant="secondary">
            New sale
          </LinkButton>
        }
      />
      <Toolbar>
        <BranchScope />
        <Box sx={{ width: { xs: '100%', sm: 192 } }}>
          <SelectField
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
          </SelectField>
        </Box>
        <Box sx={{ width: { xs: '100%', sm: 192 } }}>
          <SelectField
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
          </SelectField>
        </Box>
      </Toolbar>
      {notice && <SuccessNotice key={notice.at}>{notice.text}</SuccessNotice>}
      {!cancelling && <ApiProblem error={cancel.error} at={cancel.submittedAt} />}
      {cancelled && (
        <>
          <ApiProblem error={cancel.error} at={cancel.submittedAt} />
          <ConfirmPanel
            title={`Cancel sale ${cancelled.reference}? The stock goes back and the sale stays on record as Cancelled.`}
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
                  { id: cancelled.id, reason: reason.trim() },
                  { onSettled: flight.end },
                );
            }}
            onCancel={close}
          >
            <TextField
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
      <DataTable
        caption="Sales"
        columns={columns}
        rows={data ? rowsOf(data) : []}
        rowKey={(s) => String(s.id)}
        state={list.isPending ? 'loading' : list.isError && !data ? 'error' : 'ready'}
        errorMessage={list.isError ? describeError(list.error).title : undefined}
        onRetry={() => void list.refetch()}
        empty={
          <EmptyState
            icon={ShoppingCart}
            title="No sales match"
            description="Change the status or the payment method."
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
