import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { api, rowsOf } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey, useSingleFlight } from '../../api/idempotency';
import { ApiProblem } from '../../components/ApiProblem';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { Field } from '../../components/Field';
import { SuccessNotice } from '../../components/focus';
import { Pager } from '../../components/Pager';
import { QueryGate } from '../../components/QueryGate';
import { Select } from '../../components/Select';
import { StatusBadge } from '../../components/StatusBadge';
import { formatAccra } from '../../lib/time';
import { resolutionEffects, resolutionLabels, resolutionCodes } from './labels';

type S = components['schemas'];

/** Shortfalls the API lets this user see. Resolving is offered while something remains; the server enforces scope, quantity and the stock effects. */
export function ShortfallsPage() {
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const flight = useSingleFlight();
  const [status, setStatus] = useState<'open' | 'resolved' | ''>('open');
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState<number | null>(null);
  const [form, setForm] = useState({ resolution: '', quantity: '', note: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [notice, setNotice] = useState<{ text: string; at: number } | null>(null);
  const list = useQuery({
    placeholderData: (prev) => prev,
    queryKey: ['shortfalls', status, page],
    queryFn: () =>
      api('get', '/api/v1/shortfalls/', { query: { page, status: status || undefined } }),
  });
  const resolve = useMutation({
    mutationFn: (v: { id: number; body: S['ShortfallResolve'] }) =>
      api('post', '/api/v1/shortfalls/{id}/resolve/', {
        path: { id: v.id },
        body: v.body,
        idempotencyKey: keys.forAction(`${v.id}:${JSON.stringify(v.body)}`),
      }),
    onSuccess: async (row, v) => {
      keys.done();
      const r = row.resolutions[row.resolutions.length - 1];
      setNotice({
        text: `${r?.reference ?? 'Resolution'} recorded for ${row.item_name} (${v.body.quantity} ${resolutionLabels[v.body.resolution].toLowerCase()}). ${row.remaining} still open.`,
        at: Date.now(),
      });
      setOpened(null);
      await Promise.all(
        ['shortfalls', 'stock', 'dashboard', 'activity'].map((k) =>
          qc.invalidateQueries({ queryKey: [k] }),
        ),
      );
    },
  });
  const close = () => {
    setOpened(null);
    setErrors({});
    resolve.reset();
  };
  const open = (row: S['Shortfall']) => {
    resolve.reset();
    setNotice(null);
    setErrors({});
    setForm({ resolution: '', quantity: String(row.remaining), note: '' });
    setOpened(row.id);
  };
  const submit = (row: S['Shortfall']) => {
    const next: typeof errors = {};
    if (!form.resolution) next.resolution = 'Choose what happened to the missing items.';
    const q = Number(form.quantity);
    if (!/^\d+$/.test(form.quantity.trim()) || q < 1)
      next.quantity = 'Enter a whole number, 1 or more.';
    else if (q > row.remaining) next.quantity = `More than the ${row.remaining} still open.`;
    if (!form.note.trim()) next.note = 'Add a note.';
    setErrors(next);
    if (Object.keys(next).length) return;
    if (flight.start())
      resolve.mutate(
        {
          id: row.id,
          body: {
            resolution: form.resolution as S['ShortfallResolve']['resolution'],
            quantity: q,
            note: form.note.trim(),
          },
        },
        { onSettled: flight.end },
      );
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="text-4xl text-ink">Shortfalls</h1>
      <Select
        label="Status"
        value={status}
        onChange={(e) => {
          setStatus(e.target.value as typeof status);
          setPage(1);
        }}
      >
        <option value="open">Open</option>
        <option value="resolved">Resolved</option>
        <option value="">All</option>
      </Select>
      {notice && <SuccessNotice key={notice.at}>{notice.text}</SuccessNotice>}
      {opened === null && <ApiProblem error={resolve.error} at={resolve.submittedAt} />}
      <QueryGate query={list}>
        {(data) => {
          const rows = rowsOf(data);
          return (
            <>
              {rows.length === 0 && <p className="m-0 text-muted">No shortfalls match.</p>}
              <ul className="m-0 grid list-none gap-3 p-0">
                {rows.map((s) => (
                  <li key={s.id}>
                    <Card className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h2 className="text-2xl">{s.item_name}</h2>
                        {s.status === 'open' ? (
                          <StatusBadge status="low" label="Open" />
                        ) : (
                          <StatusBadge status="completed" label="Resolved" />
                        )}
                      </div>
                      <p className="m-0 text-sm text-muted">
                        {s.sku} · {s.dispatch_reference} · {s.origin.name} to {s.destination.name}
                        {s.received_at && ` · received ${formatAccra(s.received_at)}`}
                      </p>
                      <p className="m-0">
                        Sent {s.qty_sent} · Accepted {s.qty_accepted} · Missing {s.shortfall} ·
                        Resolved {s.resolved_quantity} ·{' '}
                        <span className="font-semibold">Remaining {s.remaining}</span>
                      </p>
                      {s.resolutions.length > 0 && (
                        <ul className="m-0 list-none p-0 text-sm">
                          {s.resolutions.map((r) => (
                            <li key={r.reference}>
                              {r.reference}: {resolutionLabels[r.action]} {r.quantity} by{' '}
                              {r.resolved_by} on {formatAccra(r.resolved_at)}. Note: {r.note}
                              {r.is_self_approval && (
                                <>
                                  {' '}
                                  <StatusBadge status="low" label="Self-approved" />
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {s.remaining > 0 && (
                        <Button
                          icon={ClipboardCheck}
                          aria-label={`Resolve shortfall of ${s.item_name} on ${s.dispatch_reference}`}
                          aria-expanded={opened === s.id}
                          className="self-start"
                          onClick={() => open(s)}
                        >
                          Resolve
                        </Button>
                      )}
                      {opened === s.id && (
                        <>
                          <ApiProblem error={resolve.error} at={resolve.submittedAt} />
                          <ConfirmPanel
                            title={`Resolve the shortfall of ${s.item_name} on ${s.dispatch_reference}? ${
                              form.resolution
                                ? resolutionEffects[
                                    form.resolution as keyof typeof resolutionEffects
                                  ]
                                : 'Choose what happened to the missing items.'
                            }`}
                            confirmLabel="Confirm resolution"
                            danger={false}
                            pending={resolve.isPending}
                            onConfirm={() => submit(s)}
                            onCancel={close}
                          >
                            <Select
                              label="Resolution"
                              value={form.resolution}
                              error={errors.resolution}
                              onChange={(e) => setForm({ ...form, resolution: e.target.value })}
                            >
                              <option value="">Choose…</option>
                              {resolutionCodes.map((c) => (
                                <option key={c} value={c}>
                                  {resolutionLabels[c]}
                                </option>
                              ))}
                            </Select>
                            <Field
                              label="Quantity"
                              inputMode="numeric"
                              hint={`Up to ${s.remaining}.`}
                              value={form.quantity}
                              error={errors.quantity}
                              autoComplete="off"
                              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                            />
                            <Field
                              label="Note"
                              value={form.note}
                              maxLength={1000}
                              error={errors.note}
                              autoComplete="off"
                              onChange={(e) => setForm({ ...form, note: e.target.value })}
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
