import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCheck, PackageCheck, XCircle } from 'lucide-react';
import { api, ApiError } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey, useSingleFlight } from '../../api/idempotency';
import { useCurrentMe } from '../../auth/guards';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { Field } from '../../components/Field';
import { QueryGate } from '../../components/QueryGate';
import { StatusBadge } from '../../components/StatusBadge';
import { formatAccra } from '../../lib/time';
import { dispatchStatusBadge } from '../dispatches/labels';
import { Button, Card } from '../../components/ui';

type S = components['schemas'];
type Dispatch = S['Dispatch'];

const count = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : NaN);

const backLink = (
  <Link
    to="/receive"
    className="inline-flex min-h-11 items-center gap-2 font-semibold text-accent underline"
  >
    <ArrowLeft aria-hidden="true" size={20} />
    <span>Back to waiting list</span>
  </Link>
);

/** The outcome of a dispatch: each line sent, received and accepted, with shortfalls highlighted. */
function Outcome({ dispatch }: { dispatch: Dispatch }) {
  const badge = dispatchStatusBadge[dispatch.status];
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-3xl">{dispatch.reference}</h2>
        <StatusBadge status={badge.status} label={badge.label} />
      </div>
      <p className="m-0 break-words">
        From {dispatch.origin.name} to {dispatch.destination.name}
      </p>
      {dispatch.received_at && (
        <p className="m-0 text-sm text-muted">
          Decided {formatAccra(dispatch.received_at)}
          {dispatch.received_by ? ` by ${dispatch.received_by}` : ''}
        </p>
      )}
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {dispatch.lines.map((l) => (
          <li
            key={l.id}
            className={`rounded-lg border p-3 ${l.shortfall > 0 ? 'border-warn bg-warn-bg' : 'border-line'}`}
          >
            <p className="m-0 break-words font-semibold">
              {l.item_name} <span className="text-sm font-normal text-muted">{l.sku}</span>
            </p>
            <p className="m-0 text-sm">
              Sent {l.qty_sent}
              {l.qty_received !== null && ` · Received ${l.qty_received}`}
              {l.qty_accepted !== null && ` · Accepted ${l.qty_accepted}`}
            </p>
            {l.shortfall > 0 && <StatusBadge status="low" label={`Short by ${l.shortfall}`} />}
            {l.line_note && <p className="m-0 text-sm">Note: {l.line_note}</p>}
          </li>
        ))}
      </ul>
      {dispatch.receive_note && <p className="m-0">Note: {dispatch.receive_note}</p>}
      {dispatch.has_open_discrepancy && (
        <p className="m-0 font-semibold">The shortfall stays open until it is resolved.</p>
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
    <div className="flex flex-col gap-4">
      <ApiProblem error={decide.error} at={decide.submittedAt} />
      <Card className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-3xl">{dispatch.reference}</h2>
          <StatusBadge status="in-transit" />
        </div>
        <p className="m-0 break-words">From {dispatch.origin.name}</p>
        <Button
          variant="secondary"
          icon={CheckCheck}
          className="self-start"
          disabled={mode !== null}
          onClick={() => {
            setQty(Object.fromEntries(dispatch.lines.map((l) => [l.id, String(l.qty_sent)])));
            setTried(false);
          }}
        >
          Received all
        </Button>
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {dispatch.lines.map((l, i) => (
            <li
              key={l.id}
              className={`flex flex-col gap-2 rounded-lg border p-3 ${shortBy[i] > 0 ? 'border-warn bg-warn-bg' : 'border-line'}`}
            >
              <p className="m-0 break-words font-semibold">
                {l.item_name} <span className="text-sm font-normal text-muted">{l.sku}</span>
              </p>
              <Field
                label={`Received: ${l.item_name}`}
                hint={`Sent: ${l.qty_sent}`}
                inputMode="numeric"
                autoComplete="off"
                disabled={mode !== null}
                value={qty[l.id] ?? ''}
                onChange={(e) => setQty({ ...qty, [l.id]: e.target.value })}
                error={lineProblem[i] ?? server?.fieldError(`lines.${i}.qty_received`)}
              />
              {shortBy[i] > 0 && <StatusBadge status="low" label={`Short by ${shortBy[i]}`} />}
            </li>
          ))}
        </ul>
        {anyShort && (
          <Field
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
        <Card className="flex flex-col gap-3">
          <Field
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
        <div className="flex flex-wrap gap-2">
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
        </div>
      )}
    </div>
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
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-4xl text-ink">Check delivery</h1>
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
    </div>
  );
}
