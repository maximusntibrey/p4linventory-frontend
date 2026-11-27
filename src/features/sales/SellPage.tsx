import { useState } from 'react';
import Box from '@mui/material/Box';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ListChecks, ShoppingCart, Trash2 } from 'components/icons';
import { api, ApiError, rowsOf } from '../../api';
import type { components } from '../../api';
import { useIdempotencyKey, useSingleFlight } from '../../api/idempotency';
import { useCurrentMe } from '../../auth/guards';
import { ApiProblem } from '../../components/ApiProblem';
import { ConfirmPanel } from '../../components/ConfirmPanel';
import { ResultCard } from '../../components/focus';
import { ItemPicker } from '../../components/ItemPicker';
import type { Candidate } from '../../components/ItemPicker';
import { BranchPicker } from '../workingBranch/BranchPicker';
import { ghs } from '../items/labels';
import { fromCents, paymentCodes, paymentLabel, toCents } from './labels';
import { Button, Card, PageHeader, SelectField, TextField, LinkButton } from '../../components/ui';

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
    <Box component="p" sx={{ m: 0, fontSize: '0.875rem', fontWeight: 600, color: 'error.main' }}>
      {unpriced} {unpriced === 1 ? 'item has' : 'items have'} no price yet, so{' '}
      {unpriced === 1 ? 'it is' : 'they are'} not in this total and cannot be sold.
    </Box>
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PageHeader title="Sell" />
        <Box component="p" sx={{ m: 0 }}>
          Choose the branch you are selling at.
        </Box>
        <BranchPicker onDone={() => undefined} />
      </Box>
    );
  }

  if (done) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <PageHeader title="Sell" />
        <ResultCard>
          <Box component="p" sx={{ m: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            Sale {done.reference} is recorded.
          </Box>
          <Box component="p" sx={{ m: 0 }}>
            Total <strong>{ghs(done.total)}</strong> · {paymentLabel(done.payment_method)}
          </Box>
          <Box component="ul" sx={{ m: 0, listStyle: 'none', p: 0 }}>
            {done.lines.map((l) => (
              <li key={l.id}>
                {l.quantity} × {l.item_name} at {ghs(l.unit_price)} = {ghs(l.line_total)}
              </li>
            ))}
          </Box>
        </ResultCard>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button icon={ShoppingCart} onClick={reset} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Sell again
          </Button>
          <LinkButton
            to="/sell/sales"
            icon={ListChecks}
            variant="secondary"
            sx={{ width: { xs: '100%', sm: 'auto' } }}
          >
            Sales list
          </LinkButton>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <PageHeader title="Sell" />
        <LinkButton to="/sell/sales" icon={ListChecks} variant="secondary">
          Sales list
        </LinkButton>
      </Box>
      <Box component="p" sx={{ m: 0, color: 'text.secondary' }}>
        Selling at{' '}
        <Box component="strong" sx={{ color: 'text.primary' }}>
          {where.name}
        </Box>
      </Box>
      <Box
        component="ol"
        sx={{ m: 0, display: 'flex', listStyle: 'none', flexWrap: 'wrap', gap: 1, p: 0 }}
        aria-label="Steps"
      >
        {steps.map((s, i) => (
          <Box
            component="li"
            key={s}
            aria-current={s === step ? 'step' : undefined}
            sx={{
              borderRadius: '999px',
              border: '1px solid',
              px: 1.5,
              py: 0.5,
              fontSize: '0.875rem',
              fontWeight: 600,
              ...(s === step
                ? {
                    borderColor: 'primary.main',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                  }
                : { borderColor: 'divider', color: 'text.secondary' }),
            }}
          >
            Step {i + 1} of 3: {stepTitle[s]}
          </Box>
        ))}
      </Box>
      <ApiProblem error={sell.error} at={sell.submittedAt} />

      {step === 'items' && (
        <>
          <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box component="h2" sx={{ fontSize: '1.875rem' }}>
              Add items
            </Box>
            <ItemPicker
              label="Find an item to sell"
              queryKey={['sell', 'find', where.id]}
              find={findStock}
              added={lines.map((l) => l.item_id)}
              onAdd={(c) => void add(c)}
            />
            {addError && <ApiProblem error={addError.error} at={addError.at} />}
          </Card>
          <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box component="h2" sx={{ fontSize: '1.875rem' }}>
              Sale list
            </Box>
            {problem?.list && (
              <Box component="p" role="alert" sx={{ m: 0, fontWeight: 600, color: 'error.main' }}>
                {problem.list}
              </Box>
            )}
            {lines.length === 0 && (
              <Box component="p" sx={{ m: 0, color: 'text.secondary' }}>
                No items yet.
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
              {lines.map((l) => (
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
                  <Box component="p" sx={{ m: 0, fontSize: '0.875rem', color: 'text.secondary' }}>
                    {l.available !== undefined && `${l.available} available · `}
                    {l.price ? `${ghs(l.price)} each` : 'No price yet'}
                  </Box>
                  <TextField
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
                    sx={{ alignSelf: 'flex-start' }}
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
                </Box>
              ))}
            </Box>
            <Box component="p" sx={{ m: 0, fontSize: '1.125rem' }}>
              Running total: <strong>{ghs(fromCents(total))}</strong>
            </Box>
            {unpricedNote}
          </Card>
          <Button
            icon={ArrowRight}
            sx={{ width: { xs: '100%', sm: 'auto' }, alignSelf: { sm: 'flex-start' } }}
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
        <Card sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box component="h2" sx={{ fontSize: '1.875rem' }}>
            Payment
          </Box>
          <SelectField
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
          </SelectField>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
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
          </Box>
        </Card>
      )}

      {step === 'review' && (
        <Card sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box component="h2" sx={{ fontSize: '1.875rem' }}>
            Confirm sale
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
                {Number(l.quantity)} × {l.name} ({l.sku}){l.price ? ` at ${ghs(l.price)} each` : ''}
              </li>
            ))}
          </Box>
          <Box component="p" sx={{ m: 0 }}>
            Payment: <strong>{paymentLabel(payment)}</strong>
          </Box>
          <Box component="p" sx={{ m: 0, fontSize: '1.125rem' }}>
            Total: <strong>{ghs(fromCents(total))}</strong>
          </Box>
          {unpricedNote}
          <Box component="p" sx={{ m: 0, fontSize: '0.875rem', color: 'text.secondary' }}>
            The final price comes from the price list.
          </Box>
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
    </Box>
  );
}
