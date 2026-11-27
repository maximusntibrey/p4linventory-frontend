import { useState } from 'react';
import Box from '@mui/material/Box';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Trash2 } from 'components/icons';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey, useSingleFlight } from '../../api/idempotency';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { ResultCard } from '../../components/focus';
import { ItemPicker } from '../../components/ItemPicker';
import type { Candidate } from '../../components/ItemPicker';
import { amountPattern, twoDecimals } from '../../lib/money';
import { formatAccra } from '../../lib/time';
import { ghs } from '../items/labels';
import { Button, Card, PageHeader, SelectField, TextField } from '../../components/ui';
import { useWarehouses } from '../branches/useWarehouses';

type S = components['schemas'];
type Line = Candidate & { quantity: string; cost: string };
type Problems = {
  warehouse?: string;
  supplier?: string;
  lines?: string;
  rows: { quantity?: string; cost?: string }[];
};

const findItems = async (q: string): Promise<Candidate[]> =>
  rowsOf(
    await api('get', '/api/v1/items/', {
      query: { q: q || undefined, status: 'active', page_size: 20 },
    }),
  ).map((i) => ({ item_id: i.id, sku: i.sku, name: i.name, note: i.brand_name ?? undefined }));

/** Format checks only. Whether the receipt is allowed (active items, no duplicates) is the server's call. */
function check(
  supplier: string,
  lines: Line[],
  needWarehouse: boolean,
  warehouse: string,
): Problems | null {
  const p: Problems = {
    rows: lines.map((l) => ({
      quantity: /^[1-9]\d*$/.test(l.quantity.trim())
        ? undefined
        : 'Enter a whole number, 1 or more.',
      cost: amountPattern.test(l.cost.trim()) ? undefined : 'Enter a cost such as 900.00.',
    })),
  };
  if (needWarehouse && !warehouse) p.warehouse = 'Choose a warehouse.';
  if (!supplier.trim()) p.supplier = 'Enter the supplier name.';
  if (lines.length === 0) p.lines = 'Add at least one item.';
  const bad = p.warehouse || p.supplier || p.lines || p.rows.some((r) => r.quantity || r.cost);
  return bad ? p : null;
}

/** Receive stock into the warehouse: supplier, item lines with quantity and unit cost, review, confirm. */
export function GoodsReceiptPage() {
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const flight = useSingleFlight();
  const warehouses = useWarehouses();
  const [warehouse, setWarehouse] = useState('');
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [problems, setProblems] = useState<Problems | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState<S['GoodsReceipt'] | null>(null);

  const body = (): S['GoodsReceiptCreate'] => ({
    ...(warehouses.choose && { warehouse_id: Number(warehouse) }),
    supplier_name: supplier.trim(),
    ...(notes.trim() && { notes: notes.trim() }),
    lines: lines.map((l) => ({
      item_id: l.item_id,
      quantity: Number(l.quantity),
      unit_cost: twoDecimals(l.cost),
    })),
  });
  const create = useMutation({
    mutationFn: (b: S['GoodsReceiptCreate']) =>
      api('post', '/api/v1/goods-receipts/', {
        body: b,
        idempotencyKey: keys.forAction(JSON.stringify(b)),
      }),
    onError: (e) => {
      if (e instanceof ApiError && e.fieldError('warehouse_id')) setReviewing(false);
    },
    onSuccess: async (receipt) => {
      keys.done();
      setDone(receipt);
      await qc.invalidateQueries({ queryKey: ['stock'] });
    },
  });
  const server = create.error instanceof ApiError ? create.error : undefined;
  const warehouseName = warehouses.list.find((w) => String(w.id) === warehouse)?.name;
  const setLine = (id: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.item_id === id ? { ...l, ...patch } : l)));
  const reset = () => {
    setWarehouse('');
    setSupplier('');
    setNotes('');
    setLines([]);
    setProblems(null);
    setReviewing(false);
    setDone(null);
    create.reset();
  };

  if (done) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PageHeader title="Receive stock" />
        <ResultCard>
          <Box component="p" sx={{ m: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            Receipt {done.reference} is confirmed. The stock is in the warehouse.
          </Box>
          <Box component="p" sx={{ m: 0, fontSize: '0.875rem', color: 'text.secondary' }}>
            {done.supplier_name} · {formatAccra(done.received_at)} · {done.received_by}
          </Box>
          <Box component="ul" sx={{ m: 0, listStyle: 'none', p: 0 }}>
            {done.lines.map((l) => (
              <li key={l.id}>
                {l.quantity} × {l.item_name} ({l.sku}){' '}
                {l.unit_cost ? ` at ${ghs(l.unit_cost)}` : ''}
              </li>
            ))}
          </Box>
        </ResultCard>
        <Button icon={ClipboardCheck} onClick={reset} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          Receive another delivery
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <PageHeader title="Receive stock" />
      <ApiProblem error={create.error} at={create.submittedAt} />
      {reviewing ? (
        <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box component="h2" sx={{ fontSize: '1.875rem' }}>
            Review
          </Box>
          {warehouses.choose && (
            <Box component="p" sx={{ m: 0 }}>
              Warehouse: <strong>{warehouseName}</strong>
            </Box>
          )}
          <Box component="p" sx={{ m: 0 }}>
            Supplier: <strong>{supplier.trim()}</strong>
          </Box>
          {notes.trim() && (
            <Box component="p" sx={{ m: 0 }}>
              Notes: {notes.trim()}
            </Box>
          )}
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
                {Number(l.quantity)} × {l.name} ({l.sku}) at {ghs(twoDecimals(l.cost))} each
              </li>
            ))}
          </Box>
          <ConfirmPanel
            danger={false}
            title="Confirm this receipt? A confirmed receipt cannot be edited."
            confirmLabel="Confirm receipt"
            pending={create.isPending}
            onConfirm={() => flight.start() && create.mutate(body(), { onSettled: flight.end })}
            onCancel={() => setReviewing(false)}
          />
        </Card>
      ) : (
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
            <TextField
              label="Supplier"
              value={supplier}
              maxLength={200}
              autoComplete="off"
              onChange={(e) => setSupplier(e.target.value)}
              error={problems?.supplier ?? server?.fieldError('supplier_name')}
            />
            <TextField
              label="Notes (optional)"
              value={notes}
              maxLength={1000}
              autoComplete="off"
              onChange={(e) => setNotes(e.target.value)}
              error={server?.fieldError('notes')}
            />
          </Card>
          <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box component="h2" sx={{ fontSize: '1.875rem' }}>
              Items
            </Box>
            <ItemPicker
              label="Find an item to receive"
              queryKey={['receipt', 'find']}
              find={findItems}
              added={lines.map((l) => l.item_id)}
              onAdd={(c) => setLines((ls) => [...ls, { ...c, quantity: '', cost: '' }])}
            />
            {problems?.lines && (
              <Box component="p" role="alert" sx={{ m: 0, fontWeight: 600, color: 'error.main' }}>
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
                  <Box
                    sx={{
                      display: 'grid',
                      gap: 1.5,
                      gridTemplateColumns: { sm: 'repeat(2, minmax(0, 1fr))' },
                    }}
                  >
                    <TextField
                      label={`Quantity: ${l.name}`}
                      inputMode="numeric"
                      autoComplete="off"
                      value={l.quantity}
                      onChange={(e) => setLine(l.item_id, { quantity: e.target.value })}
                      error={
                        problems?.rows[i]?.quantity ?? server?.fieldError(`lines.${i}.quantity`)
                      }
                    />
                    <TextField
                      label={`Unit cost (GHS): ${l.name}`}
                      inputMode="decimal"
                      autoComplete="off"
                      value={l.cost}
                      onChange={(e) => setLine(l.item_id, { cost: e.target.value })}
                      error={problems?.rows[i]?.cost ?? server?.fieldError(`lines.${i}.unit_cost`)}
                    />
                  </Box>
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
            icon={ClipboardCheck}
            sx={{ width: { xs: '100%', sm: 'auto' }, alignSelf: { sm: 'flex-start' } }}
            onClick={() => {
              const p = check(supplier, lines, warehouses.choose, warehouse);
              setProblems(p);
              if (!p) setReviewing(true);
            }}
          >
            Review receipt
          </Button>
        </>
      )}
    </Box>
  );
}
