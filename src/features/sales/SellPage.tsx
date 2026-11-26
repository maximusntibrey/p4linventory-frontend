import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ListChecks, ShoppingCart, Trash2 } from 'lucide-react';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey, useSingleFlight } from '../../api/idempotency';
import { useCurrentMe } from '../../auth/guards';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { Field } from '../../components/Field';
import { ResultCard } from '../../components/focus';
import { ItemPicker } from '../../components/ItemPicker';
import type { Candidate } from '../../components/ItemPicker';
import { Select } from '../../components/Select';
import { BranchPicker } from '../workingBranch/BranchPicker';
import { ghs } from '../items/labels';
import { fromCents, linkButton, paymentCodes, paymentLabel, toCents } from './labels';
import { Button, Card } from '../../components/ui';

type S = components['schemas'];
type Line = Candidate & { quantity: string; price: string | null };
type Step = 'items' | 'pay' | 'review';

const steps: Step[] = ['items', 'pay', 'review'];
const stepTitle: Record<Step, string> = {
  items: 'Items',
  pay: 'Payment',
  review: 'Confirm',
};

/** Sale lines priced from the price list. The client never sends a price; this is only what the screen shows while you build the list. */
const lineCents = (l: Line) =>
  l.price && /^[1-9]\d*$/.test(l.quantity.trim()) ? toCents(l.price) * Number(l.quantity) : 0;

/** Sell: add items and quantities, pick how the customer pays, confirm. The server prices the sale and refuses overselling. */
export function SellPage() {
  const me = useCurrentMe();
  const qc = useQueryClient();
  const keys = useIdempotencyKey();
  const flight = useSingleFlight();
  const [step, setStep] = useState<Step>('items');
  const [lines, setLines] = useState<Line[]>([]);
  const [payment, setPayment] = useState('');
  const [problem, setProblem] = useState<{
    // By item id, so a message stays with its line when another line is removed.
    quantities: Record<number, string | undefined>;
    list?: string;
    payment?: string;
  } | null>(null);
  // Item ids in the order they were sent: the server names lines by position in that request.
  const [sent, setSent] = useState<number[]>([]);
  const [done, setDone] = useState<S['Sale'] | null>(null);
  const [addError, setAddError] = useState<{ error: unknown; at: number } | null>(null);
  const where = me.working_branch;

  const body = (): S['SaleCreate'] => ({
    payment_method: payment,
    lines: lines.map((l) => ({ item_id: l.item_id, quantity: Number(l.quantity) })),
  });
  const sell = useMutation({
    mutationFn: (b: S['SaleCreate']) =>
      api('post', '/api/v1/sales/', { body: b, idempotencyKey: keys.forAction(JSON.stringify(b)) }),
    onSuccess: async (sale) => {
      keys.done();
      setDone(sale);
      await qc.invalidateQueries({ queryKey: ['stock'] });
      await qc.invalidateQueries({ queryKey: ['sales'] });
    },
    // A quantity above the stock (409) or a refused line (400 on lines.*) sends you back to the lines with the server's message.
    onError: (e) => {
      if (
        e instanceof ApiError &&
        (e.kind === 'conflict' || e.errors.some((x) => x.field?.startsWith('lines.')))
      )
        setStep('items');
    },
  });
  const server = sell.error instanceof ApiError ? sell.error : undefined;

  const findStock = async (q: string): Promise<Candidate[]> =>
    rowsOf(await api('get', '/api/v1/stock/', { query: { q: q || undefined, page_size: 50 } }))
      .filter((r) => r.location_id === where?.id)
      .map((r) => ({
        item_id: r.item_id,
        sku: r.sku,
        name: r.item_name,
        available: r.available,
        note: `${r.available} available`,
      }));
  const add = async (c: Candidate) => {
    try {
      const item = await api('get', '/api/v1/items/{id}/', { path: { id: c.item_id } });
      setLines((ls) =>
        ls.some((l) => l.item_id === c.item_id)
          ? ls
          : [...ls, { ...c, quantity: '1', price: item.selling_price ?? null }],
      );
      setAddError(null);
    } catch (e) {
      setAddError({ error: e, at: Date.now() });
    }
  };
  const reset = () => {
    setStep('items');
    setLines([]);
    setPayment('');
    setProblem(null);
    setDone(null);
    sell.reset();
  };

  const total = lines.reduce((sum, l) => sum + lineCents(l), 0);
  const unpriced = lines.filter((l) => !l.price).length;
  const unpricedNote = unpriced > 0 && (
    <p className="m-0 text-sm font-semibold text-bad">
      {unpriced} {unpriced === 1 ? 'item has' : 'items have'} no price yet, so{' '}
      {unpriced === 1 ? 'it is' : 'they are'} not in this total and cannot be sold.
    </p>
  );
  const quantityProblems = () =>
    Object.fromEntries(
      lines.map((l) => [
        l.item_id,
        /^[1-9]\d*$/.test(l.quantity.trim()) ? undefined : 'Enter a whole number, 1 or more.',
      ]),
    );
  const lineError = (l: Line) => {
    const at = sent.indexOf(l.item_id);
    return (
      problem?.quantities[l.item_id] ??
      (at >= 0
        ? (server?.fieldError(`lines.${at}.quantity`) ?? server?.fieldError(`lines.${at}.item_id`))
        : undefined)
    );
  };

  // A Super Admin works in the branch picked here; nobody sells without one.
  if (!where) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-4xl text-ink">Sell</h1>
        <p className="m-0">Choose the branch you are selling at.</p>
        <BranchPicker onDone={() => undefined} />
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-4xl text-ink">Sell</h1>
        <ResultCard>
          <p className="m-0 text-lg font-semibold">Sale {done.reference} is recorded.</p>
          <p className="m-0">
            Total <strong>{ghs(done.total)}</strong> · {paymentLabel(done.payment_method)}
          </p>
          <ul className="m-0 list-none p-0">
            {done.lines.map((l) => (
              <li key={l.id}>
                {l.quantity} × {l.item_name} at {ghs(l.unit_price)} = {ghs(l.line_total)}
              </li>
            ))}
          </ul>
        </ResultCard>
        <div className="flex flex-wrap gap-2">
          <Button icon={ShoppingCart} onClick={reset} className="w-full sm:w-auto">
            Sell again
          </Button>
          <Link to="/sell/sales" className={`${linkButton} w-full sm:w-auto`}>
            <ListChecks aria-hidden="true" size={20} />
            <span>Sales list</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-4xl text-ink">Sell</h1>
        <Link to="/sell/sales" className={linkButton}>
          <ListChecks aria-hidden="true" size={20} />
          <span>Sales list</span>
        </Link>
      </div>
      <p className="m-0 text-muted">
        Selling at <strong className="text-ink">{where.name}</strong>
      </p>
      <ol className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="Steps">
        {steps.map((s, i) => (
          <li
            key={s}
            aria-current={s === step ? 'step' : undefined}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${s === step ? 'border-accent bg-accent text-white' : 'border-line text-muted'}`}
          >
            Step {i + 1} of 3: {stepTitle[s]}
          </li>
        ))}
      </ol>
      <ApiProblem error={sell.error} at={sell.submittedAt} />

      {step === 'items' && (
        <>
          <Card className="flex flex-col gap-3">
            <h2 className="text-3xl">Add items</h2>
            <ItemPicker
              label="Find an item to sell"
              queryKey={['sell', 'find', where.id]}
              find={findStock}
              added={lines.map((l) => l.item_id)}
              onAdd={(c) => void add(c)}
            />
            {addError && <ApiProblem error={addError.error} at={addError.at} />}
          </Card>
          <Card className="flex flex-col gap-3">
            <h2 className="text-3xl">Sale list</h2>
            {problem?.list && (
              <p role="alert" className="m-0 font-semibold text-bad">
                {problem.list}
              </p>
            )}
            {lines.length === 0 && <p className="m-0 text-muted">No items yet.</p>}
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {lines.map((l) => (
                <li
                  key={l.item_id}
                  className="flex flex-col gap-2 rounded-lg border border-line p-3"
                >
                  <p className="m-0 break-words font-semibold">
                    {l.name} <span className="text-sm font-normal text-muted">{l.sku}</span>
                  </p>
                  <p className="m-0 text-sm text-muted">
                    {l.available !== undefined && `${l.available} available · `}
                    {l.price ? `${ghs(l.price)} each` : 'No price yet'}
                  </p>
                  <Field
                    label={`Quantity: ${l.name}`}
                    inputMode="numeric"
                    autoComplete="off"
                    value={l.quantity}
                    onChange={(e) =>
                      setLines((ls) =>
                        ls.map((x) =>
                          x.item_id === l.item_id ? { ...x, quantity: e.target.value } : x,
                        ),
                      )
                    }
                    error={lineError(l)}
                  />
                  <Button
                    variant="secondary"
                    icon={Trash2}
                    aria-label={`Remove ${l.name}`}
                    className="self-start"
                    onClick={() => {
                      setLines((ls) => ls.filter((x) => x.item_id !== l.item_id));
                      setProblem(
                        (p) =>
                          p && {
                            ...p,
                            list: undefined,
                            quantities: { ...p.quantities, [l.item_id]: undefined },
                          },
                      );
                    }}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
            <p className="m-0 text-lg">
              Running total: <strong>{ghs(fromCents(total))}</strong>
            </p>
            {unpricedNote}
          </Card>
          <Button
            icon={ArrowRight}
            className="w-full sm:w-auto sm:self-start"
            onClick={() => {
              const quantities = quantityProblems();
              const list = lines.length === 0 ? 'Add at least one item.' : undefined;
              setProblem({ quantities, list });
              if (!list && Object.values(quantities).every((q) => !q)) {
                sell.reset();
                setStep('pay');
              }
            }}
          >
            Next: payment
          </Button>
        </>
      )}

      {step === 'pay' && (
        <Card className="flex flex-col gap-4">
          <h2 className="text-3xl">Payment</h2>
          <Select
            label="Payment method"
            value={payment}
            onChange={(e) => setPayment(e.target.value)}
            error={problem?.payment ?? server?.fieldError('payment_method')}
          >
            <option value="">Choose one</option>
            {paymentCodes.map((c) => (
              <option key={c} value={c}>
                {paymentLabel(c)}
              </option>
            ))}
          </Select>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={ArrowLeft} onClick={() => setStep('items')}>
              Back
            </Button>
            <Button
              icon={ArrowRight}
              onClick={() => {
                if (!payment) setProblem({ quantities: {}, payment: 'Choose a payment method.' });
                else {
                  setProblem(null);
                  setStep('review');
                }
              }}
            >
              Next: confirm
            </Button>
          </div>
        </Card>
      )}

      {step === 'review' && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-3xl">Confirm sale</h2>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {lines.map((l) => (
              <li key={l.item_id}>
                {Number(l.quantity)} × {l.name} ({l.sku}){l.price ? ` at ${ghs(l.price)} each` : ''}
              </li>
            ))}
          </ul>
          <p className="m-0">
            Payment: <strong>{paymentLabel(payment)}</strong>
          </p>
          <p className="m-0 text-lg">
            Total: <strong>{ghs(fromCents(total))}</strong>
          </p>
          {unpricedNote}
          <p className="m-0 text-sm text-muted">The final price comes from the price list.</p>
          <ConfirmPanel
            danger={false}
            title="Record this sale? The stock is taken off straight away."
            confirmLabel="Confirm sale"
            pending={sell.isPending}
            onConfirm={() => {
              if (!flight.start()) return;
              setSent(lines.map((l) => l.item_id));
              sell.mutate(body(), { onSettled: flight.end });
            }}
            onCancel={() => setStep('pay')}
          />
        </Card>
      )}
    </div>
  );
}
