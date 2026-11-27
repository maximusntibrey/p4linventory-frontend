import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Send, Trash2 } from 'lucide-react';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey, useSingleFlight } from '../../api/idempotency';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { ResultCard } from '../../components/focus';
import { ItemPicker } from '../../components/ItemPicker';
import type { Candidate } from '../../components/ItemPicker';
import { useWarehouses } from '../branches/useWarehouses';
import { QueryGate } from '../../components/QueryGate';
import { Button, Card, PageHeader, SelectField, TextField } from '../../components/ui';

type S = components['schemas'];
type Line = Candidate & { quantity: string };
type Problems = {
  warehouse?: string;
  destination?: string;
  lines?: string;
  rows: (string | undefined)[];
};

/** Format checks only. Whether the stock is there is the server's call (409). */
function check(
  destination: string,
  lines: Line[],
  needWarehouse: boolean,
  warehouse: string,
): Problems | null {
  const p: Problems = {
    rows: lines.map((l) =>
      /^[1-9]\d*$/.test(l.quantity.trim()) ? undefined : 'Enter a whole number, 1 or more.',
    ),
  };
  if (needWarehouse && !warehouse) p.warehouse = 'Choose a warehouse.';
  if (!destination) p.destination = 'Choose a branch.';
  if (lines.length === 0) p.lines = 'Add at least one item.';
  return p.warehouse || p.destination || p.lines || p.rows.some(Boolean) ? p : null;
}

/** Dispatch warehouse stock to a branch: branch, lines (each shows what is available), review, confirm. */
export function DispatchNew() {
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const flight = useSingleFlight();
  const warehouses = useWarehouses();
  const [warehouse, setWarehouse] = useState('');
  const [destination, setDestination] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [problems, setProblems] = useState<Problems | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState<S['Dispatch'] | null>(null);
  const places = useQuery({
    queryKey: ['dispatch', 'places'],
    queryFn: () => api('get', '/api/v1/branches/', { query: { is_active: true, page_size: 100 } }),
  });

  const create = useMutation({
    mutationFn: (b: S['DispatchCreate']) =>
      api('post', '/api/v1/dispatches/', {
        body: b,
        idempotencyKey: keys.forAction(JSON.stringify(b)),
      }),
    onError: (e) => {
      if (e instanceof ApiError && e.fieldError('warehouse_id')) setReviewing(false);
    },
    onSuccess: async (d) => {
      keys.done();
      setDone(d);
      await qc.invalidateQueries({ queryKey: ['stock'] });
      await qc.invalidateQueries({ queryKey: ['dispatches'] });
    },
  });
  const server = create.error instanceof ApiError ? create.error : undefined;
  const setQuantity = (id: number, quantity: string) =>
    setLines((ls) => ls.map((l) => (l.item_id === id ? { ...l, quantity } : l)));
  const reset = () => {
    setWarehouse('');
    setDestination('');
    setLines([]);
    setProblems(null);
    setReviewing(false);
    setDone(null);
    create.reset();
  };

  const back = (
    <Link
      to="/dispatches"
      className="inline-flex min-h-target items-center gap-2 font-semibold text-primary-solid underline"
    >
      <ArrowLeft aria-hidden="true" size={20} />
      <span>Back to dispatches</span>
    </Link>
  );

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title="Dispatch to a branch" />
        <ResultCard>
          <p className="m-0 text-lg font-semibold">
            Dispatch {done.reference} to {done.destination.name} is on its way.
          </p>
          <ul className="m-0 list-none p-0">
            {done.lines.map((l) => (
              <li key={l.id}>
                {l.qty_sent} × {l.item_name} ({l.sku})
              </li>
            ))}
          </ul>
        </ResultCard>
        <Button icon={Send} onClick={reset} className="w-full sm:w-auto">
          Dispatch more stock
        </Button>
        {back}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Dispatch to a branch" />
      <ApiProblem error={create.error} at={create.submittedAt} />
      <QueryGate query={places}>
        {(page) => {
          const all = rowsOf(page);
          const branches = all.filter((b) => b.kind === 'branch');
          const origin = warehouses.choose
            ? warehouses.list.find((w) => String(w.id) === warehouse)
            : warehouses.only;
          const find = async (q: string): Promise<Candidate[]> =>
            rowsOf(
              await api('get', '/api/v1/stock/', {
                query: { location_id: origin?.id, q: q || undefined, page_size: 20 },
              }),
            ).map((r) => ({
              item_id: r.item_id,
              sku: r.sku,
              name: r.item_name,
              note: `Available: ${r.available}`,
              available: r.available,
            }));
          const to = branches.find((b) => String(b.id) === destination);
          if (reviewing) {
            return (
              <Card className="flex flex-col gap-3">
                <h2 className="text-3xl">Review</h2>
                {warehouses.choose && (
                  <p className="m-0">
                    From: <strong>{origin?.name}</strong>
                  </p>
                )}
                <p className="m-0">
                  To: <strong>{to?.name}</strong>
                </p>
                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                  {lines.map((l) => (
                    <li key={l.item_id}>
                      {Number(l.quantity)} × {l.name} ({l.sku}), {l.note}
                    </li>
                  ))}
                </ul>
                <ConfirmPanel
                  danger={false}
                  title="Confirm this dispatch? The stock is set aside and cannot be cancelled here."
                  confirmLabel="Confirm dispatch"
                  pending={create.isPending}
                  onConfirm={() =>
                    flight.start() &&
                    create.mutate(
                      {
                        ...(warehouses.choose && { warehouse_id: Number(warehouse) }),
                        destination_id: Number(destination),
                        lines: lines.map((l) => ({
                          item_id: l.item_id,
                          quantity: Number(l.quantity),
                        })),
                      },
                      { onSettled: flight.end },
                    )
                  }
                  onCancel={() => setReviewing(false)}
                />
              </Card>
            );
          }
          return (
            <>
              <Card className="flex flex-col gap-4">
                {warehouses.choose && (
                  <SelectField
                    label="Warehouse"
                    value={warehouse}
                    onChange={(e) => setWarehouse(e.target.value)}
                    error={problems?.warehouse ?? server?.fieldError('warehouse_id')}
                  >
                    <option value="">Choose a warehouse…</option>
                    {warehouses.list.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </SelectField>
                )}
                <SelectField
                  label="Destination branch"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  error={problems?.destination ?? server?.fieldError('destination_id')}
                >
                  <option value="">Choose a branch…</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </SelectField>
              </Card>
              <Card className="flex flex-col gap-3">
                <h2 className="text-3xl">Items</h2>
                <ItemPicker
                  label="Find an item in the warehouse"
                  queryKey={['dispatch', 'find', origin?.id]}
                  find={find}
                  added={lines.map((l) => l.item_id)}
                  onAdd={(c) => setLines((ls) => [...ls, { ...c, quantity: '' }])}
                />
                {problems?.lines && (
                  <p role="alert" className="m-0 font-semibold text-bad">
                    {problems.lines}
                  </p>
                )}
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {lines.map((l, i) => (
                    <li
                      key={l.item_id}
                      className="flex flex-col gap-2 rounded-lg border border-line p-3"
                    >
                      <p className="m-0 break-words font-semibold">
                        {l.name} <span className="text-sm font-normal text-muted">{l.sku}</span>
                      </p>
                      <TextField
                        label={`Quantity: ${l.name}`}
                        hint={l.note}
                        inputMode="numeric"
                        autoComplete="off"
                        value={l.quantity}
                        onChange={(e) => setQuantity(l.item_id, e.target.value)}
                        error={problems?.rows[i] ?? server?.fieldError(`lines.${i}.quantity`)}
                      />
                      {l.available !== undefined && Number(l.quantity) > l.available && (
                        <p className="m-0 flex items-center gap-1 text-sm font-semibold text-warn">
                          <AlertTriangle aria-hidden="true" size={16} />
                          <span>
                            More than the {l.available} available. The server may refuse it.
                          </span>
                        </p>
                      )}
                      <Button
                        variant="secondary"
                        icon={Trash2}
                        aria-label={`Remove ${l.name}`}
                        className="self-start"
                        onClick={() => setLines((ls) => ls.filter((x) => x.item_id !== l.item_id))}
                      >
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
              <Button
                icon={Send}
                className="w-full sm:w-auto sm:self-start"
                onClick={() => {
                  const p = check(destination, lines, warehouses.choose, warehouse);
                  setProblems(p);
                  if (!p) setReviewing(true);
                }}
              >
                Review dispatch
              </Button>
              {back}
            </>
          );
        }}
      </QueryGate>
    </div>
  );
}
