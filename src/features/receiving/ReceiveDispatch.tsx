import { useState } from 'react';
import Box from '@mui/material/Box';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCheck, PackageCheck, XCircle } from 'components/icons';
import { api, ApiError } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey, useSingleFlight } from '../../api/idempotency';
import { useCurrentMe } from '../../auth/guards';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { QueryGate } from '../../components/QueryGate';
import { formatAccra } from '../../lib/time';
import { dispatchStatusBadge } from '../dispatches/labels';
import { Button, Card, PageHeader, StatusWord, TextField } from '../../components/ui';

type S = components['schemas'];
type Dispatch = S['Dispatch'];

const count = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : NaN);

const backLink = (
  <Box
    component={Link}
    to="/receive"
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
    <span>Back to waiting list</span>
  </Box>
);

/** The outcome of a dispatch: each line sent, received and accepted, with shortfalls highlighted. */
function Outcome({ dispatch }: { dispatch: Dispatch }) {
  const badge = dispatchStatusBadge[dispatch.status];
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <Box component="h2" sx={{ fontSize: '1.875rem' }}>
          {dispatch.reference}
        </Box>
        <StatusWord status={badge.status} label={badge.label} />
      </Box>
      <Box component="p" sx={{ m: 0, overflowWrap: 'anywhere' }}>
        From {dispatch.origin.name} to {dispatch.destination.name}
      </Box>
      {dispatch.received_at && (
        <Box component="p" sx={{ m: 0, fontSize: '0.875rem', color: 'text.secondary' }}>
          Decided {formatAccra(dispatch.received_at)}
          {dispatch.received_by ? ` by ${dispatch.received_by}` : ''}
        </Box>
      )}
      <Box
        component="ul"
        sx={{ m: 0, display: 'flex', listStyle: 'none', flexDirection: 'column', gap: 1, p: 0 }}
      >
        {dispatch.lines.map((l) => (
          <Box
            component="li"
            key={l.id}
            sx={{
              borderRadius: 1,
              border: '1px solid',
              p: 1.5,
              ...(l.shortfall > 0
                ? { borderColor: 'warning.main', bgcolor: 'warning.lighter' }
                : { borderColor: 'divider' }),
            }}
          >
            <Box component="p" sx={{ m: 0, overflowWrap: 'anywhere', fontWeight: 600 }}>
              {l.item_name}{' '}
              <Box
                component="span"
                sx={{ fontSize: '0.875rem', fontWeight: 400, color: 'text.secondary' }}
              >
                {l.sku}
              </Box>
            </Box>
            <Box component="p" sx={{ m: 0, fontSize: '0.875rem' }}>
              Sent {l.qty_sent}
              {l.qty_received !== null && ` · Received ${l.qty_received}`}
              {l.qty_accepted !== null && ` · Accepted ${l.qty_accepted}`}
            </Box>
            {l.shortfall > 0 && <StatusWord status="low" label={`Short by ${l.shortfall}`} />}
            {l.line_note && (
              <Box component="p" sx={{ m: 0, fontSize: '0.875rem' }}>
                Note: {l.line_note}
              </Box>
            )}
          </Box>
        ))}
      </Box>
      {dispatch.receive_note && (
        <Box component="p" sx={{ m: 0 }}>
          Note: {dispatch.receive_note}
        </Box>
      )}
      {dispatch.has_open_discrepancy && (
        <Box component="p" sx={{ m: 0, fontWeight: 600 }}>
          The shortfall stays open until it is resolved.
        </Box>
      )}
    </Card>
  );
}

type Mode = 'receive' | 'reject' | null;

/** One decision per delivery. Quantities start at what was sent; any shortfall needs a note. */
function ReceiveForm({ dispatch }: { dispatch: Dispatch }) {
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const flight = useSingleFlight();
  const [qty, setQty] = useState<Record<number, string>>(
    Object.fromEntries(dispatch.lines.map((l) => [l.id, String(l.qty_sent)])),
  );
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [mode, setMode] = useState<Mode>(null);
  const [tried, setTried] = useState(false);
  const [reasonTried, setReasonTried] = useState(false);

  const decide = useMutation({
    mutationFn: (b: S['DispatchReceive']) =>
      api('post', '/api/v1/dispatches/{id}/receive/', {
        path: { id: dispatch.id },
        body: b,
        idempotencyKey: keys.forAction(JSON.stringify(b)),
      }),
    onSuccess: async (d) => {
      keys.done();
      qc.setQueryData(['dispatches', 'one', String(dispatch.id)], d);
      await qc.invalidateQueries({ queryKey: ['dispatches'] });
      await qc.invalidateQueries({ queryKey: ['stock'] });
    },
    // A 409 means the delivery was already decided: reload it so its outcome shows instead of the form.
    onError: async (e) => {
      if (e instanceof ApiError && e.kind === 'conflict') {
        await qc.invalidateQueries({ queryKey: ['dispatches', 'one', String(dispatch.id)] });
      }
    },
  });
  const server = decide.error instanceof ApiError ? decide.error : undefined;

  const received = dispatch.lines.map((l) => count(qty[l.id] ?? ''));
  const lineProblem = received.map((n, i) =>
    Number.isNaN(n)
      ? 'Enter a whole number, 0 or more.'
      : n > dispatch.lines[i].qty_sent
        ? `More than the ${dispatch.lines[i].qty_sent} that were sent.`
        : undefined,
  );
  const shortBy = dispatch.lines.map((l, i) => Math.max(0, l.qty_sent - (received[i] || 0)));
  const anyShort = shortBy.some((n) => n > 0);
  const noteMissing = anyShort && !note.trim();
  const blocked = lineProblem.some(Boolean) || noteMissing;
  const totalSent = dispatch.lines.reduce((n, l) => n + l.qty_sent, 0);
  const totalGot = received.reduce((n, v) => n + (v || 0), 0);

  const send = () => {
    if (mode === 'reject' && !reason.trim()) {
      setReasonTried(true);
      return;
    }
    if (!flight.start()) return;
    if (mode === 'reject') {
      decide.mutate({ decision: 'reject', reason: reason.trim() }, { onSettled: flight.end });
      return;
    }
    decide.mutate(
      {
        decision: anyShort ? 'approve_partial' : 'approve_all',
        ...(anyShort && { note: note.trim() }),
        lines: dispatch.lines.map((l, i) => ({
          line_id: l.id,
          qty_received: received[i],
          qty_accepted: received[i],
        })),
      },
      { onSettled: flight.end },
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <ApiProblem error={decide.error} at={decide.submittedAt} />
      <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box component="h2" sx={{ fontSize: '1.875rem' }}>
            {dispatch.reference}
          </Box>
          <StatusWord status="in-transit" />
        </Box>
        <Box component="p" sx={{ m: 0, overflowWrap: 'anywhere' }}>
          From {dispatch.origin.name}
        </Box>
        <Button
          variant="secondary"
          icon={CheckCheck}
          sx={{ alignSelf: 'flex-start' }}
          disabled={mode !== null}
          onClick={() => {
            setQty(Object.fromEntries(dispatch.lines.map((l) => [l.id, String(l.qty_sent)])));
            setTried(false);
          }}
        >
          Received all
        </Button>
        <Box
          component="ul"
          sx={{ m: 0, display: 'flex', listStyle: 'none', flexDirection: 'column', gap: 1.5, p: 0 }}
        >
          {dispatch.lines.map((l, i) => (
            <Box
              component="li"
              key={l.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                borderRadius: 1,
                border: '1px solid',
                p: 1.5,
                ...(shortBy[i] > 0
                  ? { borderColor: 'warning.main', bgcolor: 'warning.lighter' }
                  : { borderColor: 'divider' }),
              }}
            >
              <Box component="p" sx={{ m: 0, overflowWrap: 'anywhere', fontWeight: 600 }}>
                {l.item_name}{' '}
                <Box
                  component="span"
                  sx={{ fontSize: '0.875rem', fontWeight: 400, color: 'text.secondary' }}
                >
                  {l.sku}
                </Box>
              </Box>
              <TextField
                label={`Received: ${l.item_name}`}
                hint={`Sent: ${l.qty_sent}`}
                inputMode="numeric"
                autoComplete="off"
                disabled={mode !== null}
                value={qty[l.id] ?? ''}
                onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })}
                error={lineProblem[i] ?? server?.fieldError(`lines.${i}.qty_received`)}
              />
              {shortBy[i] > 0 && <StatusWord status="low" label={`Short by ${shortBy[i]}`} />}
            </Box>
          ))}
        </Box>
        {anyShort && (
          <TextField
            label="Note about the shortfall"
            hint="Say what is missing or wrong. This is needed when less than was sent arrives."
            maxLength={1000}
            autoComplete="off"
            disabled={mode !== null}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            error={
              (tried && noteMissing ? 'Add a note about the shortfall.' : undefined) ??
              server?.fieldError('note')
            }
          />
        )}
      </Card>

      {mode === 'receive' && (
        <ConfirmPanel
          danger={false}
          title={`Receive ${totalGot} of ${totalSent} units${anyShort ? ` (short by ${totalSent - totalGot})` : ''}? This is the one decision for this delivery.`}
          confirmLabel="Confirm receipt"
          pending={decide.isPending}
          onConfirm={send}
          onCancel={() => setMode(null)}
        />
      )}
      {mode === 'reject' && (
        <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            label="Reason for rejecting"
            maxLength={1000}
            autoComplete="off"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            error={
              (reasonTried && !reason.trim() ? 'Give a reason for rejecting.' : undefined) ??
              server?.fieldError('reason')
            }
          />
          <ConfirmPanel
            title="Reject this whole delivery? Nothing is added to this branch's stock."
            confirmLabel="Confirm rejection"
            pending={decide.isPending}
            onConfirm={send}
            onCancel={() => setMode(null)}
          />
        </Card>
      )}
      {mode === null && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button
            icon={PackageCheck}
            onClick={() => {
              setTried(true);
              if (!blocked) setMode('receive');
            }}
          >
            Review delivery
          </Button>
          <Button variant="danger" icon={XCircle} onClick={() => setMode('reject')}>
            Reject delivery
          </Button>
        </Box>
      )}
    </Box>
  );
}

/** One delivery. The form shows only when the API says the delivery is still waiting and /me lets the user receive. */
export function ReceiveDispatch() {
  const { id = '' } = useParams();
  const canReceive = useCurrentMe().permissions.includes('dispatches.receive');
  const one = useQuery({
    queryKey: ['dispatches', 'one', id],
    queryFn: () => api('get', '/api/v1/dispatches/{id}/', { path: { id } }),
  });
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Check delivery" />
      <QueryGate query={one}>
        {(d) =>
          d.status === 'in_transit' && canReceive ? (
            <ReceiveForm dispatch={d} />
          ) : (
            <Outcome dispatch={d} />
          )
        }
      </QueryGate>
      {backLink}
    </Box>
  );
}
