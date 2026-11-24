import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, Trash2 } from 'lucide-react';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey, useSingleFlight } from '../../api/idempotency';
import { ApiProblem } from '../../components/ApiProblem';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { Field } from '../../components/Field';
import { ResultCard } from '../../components/focus';
import { ItemPicker } from '../../components/ItemPicker';
import type { Candidate } from '../../components/ItemPicker';
import { amountPattern, twoDecimals } from '../../lib/money';
import { formatAccra } from '../../lib/time';
import { ghs } from '../items/labels';

type S = components['schemas'];
type Line = Candidate & { quantity: string; cost: string };
type Problems = { supplier?: string; lines?: string; rows: { quantity?: string; cost?: string }[] };

const findItems = async (q: string): Promise<Candidate[]> =>
  rowsOf(
    await api('get', '/api/v1/items/', {
      query: { q: q || undefined, status: 'active', page_size: 20 },
    }),
  ).map((i) => ({ item_id: i.id, sku: i.sku, name: i.name, note: i.brand_name ?? undefined }));

/** Format checks only. Whether the receipt is allowed (active items, no duplicates) is the server's call. */
function check(supplier: string, lines: Line[]): Problems | null {
  const p: Problems = {
    rows: lines.map((l) => ({
      quantity: /^[1-9]\d*$/.test(l.quantity.trim())
        ? undefined
        : 'Enter a whole number, 1 or more.',
      cost: amountPattern.test(l.cost.trim()) ? undefined : 'Enter a cost such as 900.00.',
    })),
  };
  if (!supplier.trim()) p.supplier = 'Enter the supplier name.';
  if (lines.length === 0) p.lines = 'Add at least one item.';
  const bad = p.supplier || p.lines || p.rows.some((r) => r.quantity || r.cost);
  return bad ? p : null;
}

/** Receive stock into the warehouse: supplier, item lines with quantity and unit cost, review, confirm. */
export function GoodsReceiptPage() {
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const flight = useSingleFlight();
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [problems, setProblems] = useState<Problems | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [done, setDone] = useState<S['GoodsReceipt'] | null>(null);

  const body = (): S['GoodsReceiptCreate'] => ({
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
    onSuccess: async (receipt) => {
      keys.done();
      setDone(receipt);
      await qc.invalidateQueries({ queryKey: ['stock'] });
    },
  });
  const server = create.error instanceof ApiError ? create.error : undefined;
  const setLine = (id: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.item_id === id ? { ...l, ...patch } : l)));
  const reset = () => {
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
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-4xl text-ink">Receive stock</h1>
        <ResultCard>
          <p className="m-0 text-lg font-semibold">
            Receipt {done.reference} is confirmed. The stock is in the warehouse.
          </p>
          <p className="m-0 text-sm text-muted">
            {done.supplier_name} · {formatAccra(done.received_at)} · {done.received_by}
          </p>
          <ul className="m-0 list-none p-0">
            {done.lines.map((l) => (
              <li key={l.id}>
                {l.quantity} × {l.item_name} ({l.sku}) at {ghs(l.unit_cost)}
              </li>
            ))}
          </ul>
        </ResultCard>
        <Button icon={ClipboardCheck} onClick={reset} className="w-full sm:w-auto">
          Receive another delivery
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-4xl text-ink">Receive stock</h1>
      <ApiProblem error={create.error} at={create.submittedAt} />
      {reviewing ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-3xl">Review</h2>
          <p className="m-0">
            Supplier: <strong>{supplier.trim()}</strong>
          </p>
          {notes.trim() && <p className="m-0">Notes: {notes.trim()}</p>}
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {lines.map((l) => (
              <li key={l.item_id}>
                {Number(l.quantity)} × {l.name} ({l.sku}) at {ghs(twoDecimals(l.cost))} each
              </li>
            ))}
          </ul>
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
          <Card className="flex flex-col gap-4">
            <Field
              label="Supplier"
              value={supplier}
              maxLength={200}
              autoComplete="off"
              onChange={(e) => setSupplier(e.target.value)}
              error={problems?.supplier ?? server?.fieldError('supplier_name')}
            />
            <Field
              label="Notes (optional)"
              value={notes}
              maxLength={1000}
              autoComplete="off"
              onChange={(e) => setNotes(e.target.value)}
              error={server?.fieldError('notes')}
            />
          </Card>
          <Card className="flex flex-col gap-3">
            <h2 className="text-3xl">Items</h2>
            <ItemPicker
              label="Find an item to receive"
              queryKey={['receipt', 'find']}
              find={findItems}
              added={lines.map((l) => l.item_id)}
              onAdd={(c) => setLines((ls) => [...ls, { ...c, quantity: '', cost: '' }])}
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      label={`Quantity: ${l.name}`}
                      inputMode="numeric"
                      autoComplete="off"
                      value={l.quantity}
                      onChange={(e) => setLine(l.item_id, { quantity: e.target.value })}
                      error={
                        problems?.rows[i]?.quantity ?? server?.fieldError(`lines.${i}.quantity`)
                      }
                    />
                    <Field
                      label={`Unit cost (GHS): ${l.name}`}
                      inputMode="decimal"
                      autoComplete="off"
                      value={l.cost}
                      onChange={(e) => setLine(l.item_id, { cost: e.target.value })}
                      error={problems?.rows[i]?.cost ?? server?.fieldError(`lines.${i}.unit_cost`)}
                    />
                  </div>
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
            icon={ClipboardCheck}
            className="w-full sm:w-auto sm:self-start"
            onClick={() => {
              const p = check(supplier, lines);
              setProblems(p);
              if (!p) setReviewing(true);
            }}
          >
            Review receipt
          </Button>
        </>
      )}
    </div>
  );
}
