import { useState } from 'react';
import Box from '@mui/material/Box';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Send, Trash2 } from 'components/icons';
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
    <Box
      component={Link}
      to="/dispatches"
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
      <span>Back to dispatches</span>
    </Box>
  );

  if (done) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PageHeader title="Dispatch to a branch" />
        <ResultCard>
          <Box component="p" sx={{ m: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            Dispatch {done.reference} to {done.destination.name} is on its way.
          </Box>
          <Box component="ul" sx={{ m: 0, listStyle: 'none', p: 0 }}>
            {done.lines.map((l) => (
              <li key={l.id}>
                {l.qty_sent} × {l.item_name} ({l.sku})
              </li>
            ))}
          </Box>
        </ResultCard>
        <Button icon={Send} onClick={reset} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          Dispatch more stock
        </Button>
        {back}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box component="h2" sx={{ fontSize: '1.875rem' }}>
                  Review
                </Box>
                {warehouses.choose && (
                  <Box component="p" sx={{ m: 0 }}>
                    From: <strong>{origin?.name}</strong>
                  </Box>
                )}
                <Box component="p" sx={{ m: 0 }}>
                  To: <strong>{to?.name}</strong>
                </Box>
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    display: 'flex',
                    listStyle: 'none',
                    flexDirection: 'column',
                    gap: 0.5,
                    p: 0,
                  }}
                >
                  {lines.map((l) => (
                    <li key={l.item_id}>
                      {Number(l.quantity)} × {l.name} ({l.sku}), {l.note}
                    </li>
                  ))}
                </Box>
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
              <Card sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box component="h2" sx={{ fontSize: '1.875rem' }}>
                  Items
                </Box>
                <ItemPicker
                  label="Find an item in the warehouse"
                  queryKey={['dispatch', 'find', origin?.id]}
                  find={find}
                  added={lines.map((l) => l.item_id)}
                  onAdd={(c) => setLines((ls) => [...ls, { ...c, quantity: '' }])}
                />
                {problems?.lines && (
                  <Box
                    component="p"
                    role="alert"
                    sx={{ m: 0, fontWeight: 600, color: 'error.main' }}
                  >
                    {problems.lines}
                  </Box>
                )}
                <Box
                  component="ul"
                  sx={{
                    m: 0,
                    display: 'flex',
                    listStyle: 'none',
                    flexDirection: 'column',
                    gap: 1.5,
                    p: 0,
                  }}
                >
                  {lines.map((l, i) => (
                    <Box
                      component="li"
                      key={l.item_id}
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        p: 1.5,
                      }}
                    >
                      <Box component="p" sx={{ m: 0, overflowWrap: 'anywhere', fontWeight: 600 }}>
                        {l.name}{' '}
                        <Box
                          component="span"
                          sx={{ fontSize: '0.875rem', fontWeight: 400, color: 'text.secondary' }}
                        >
                          {l.sku}
                        </Box>
                      </Box>
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
                        <Box
                          component="p"
                          sx={{
                            m: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: 'warning.main',
                          }}
                        >
                          <AlertTriangle aria-hidden="true" size={16} />
                          <span>
                            More than the {l.available} available. The server may refuse it.
                          </span>
                        </Box>
                      )}
                      <Button
                        variant="secondary"
                        icon={Trash2}
                        aria-label={`Remove ${l.name}`}
                        sx={{ alignSelf: 'flex-start' }}
                        onClick={() => setLines((ls) => ls.filter((x) => x.item_id !== l.item_id))}
                      >
                        Remove
                      </Button>
                    </Box>
                  ))}
                </Box>
              </Card>
              <Button
                icon={Send}
                sx={{ width: { xs: '100%', sm: 'auto' }, alignSelf: { sm: 'flex-start' } }}
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
    </Box>
  );
}
