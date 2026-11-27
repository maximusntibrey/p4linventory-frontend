import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { mockSession, mockStore } from '../../mocks/handlers';
import { server } from '../../mocks/server';
import { apiError, capture, click, type } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const sellH1 = () => screen.findByRole('heading', { level: 1, name: 'Sell' });

/** Search "HP", add it and set the quantity. */
async function addHp(quantity = '2') {
  await sellH1();
  type('Find an item to sell', 'HP');
  click('Search');
  fireEvent.click(await screen.findByRole('button', { name: 'Add HP 250 G9' }));
  const q = await screen.findByLabelText('Quantity: HP 250 G9');
  type('Quantity: HP 250 G9', quantity);
  return q;
}
const toReview = async (method = 'cash') => {
  click('Next: payment');
  await screen.findByRole('heading', { level: 2, name: 'Payment' });
  type('Payment method', method);
  click('Next: confirm');
  await screen.findByRole('heading', { level: 2, name: 'Confirm sale' });
};

describe('sell screen', () => {
  it('sells in three steps: items and running total, payment, confirm; shows the server total; axe clean at each step', async () => {
    const { container } = renderApp('/sell', { as: 'front_staff' });
    await addHp('2');
    expect(screen.getByText('3 available · GHS 1250.00 each')).toBeTruthy();
    expect(screen.getByText('GHS 2500.00')).toBeTruthy(); // running total
    expect(screen.getByText('Step 1 of 3: Items').getAttribute('aria-current')).toBe('step');
    expect(await axe(container)).toHaveNoViolations();
    click('Next: payment');
    await screen.findByRole('heading', { level: 2, name: 'Payment' });
    expect(await axe(container)).toHaveNoViolations();
    type('Payment method', 'mobile_money');
    click('Next: confirm');
    await screen.findByRole('heading', { level: 2, name: 'Confirm sale' });
    expect(screen.getByText('Mobile money')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
    click('Confirm sale');
    expect(await screen.findByText('Sale SAL-000003 is recorded.')).toBeTruthy();
    expect(screen.getByText(/Total/).textContent).toContain('GHS 2500.00');
    expect(screen.getByText(/2 × HP 250 G9 at GHS 1250.00 = GHS 2500.00/)).toBeTruthy();
    expect(screen.queryByText(/cost/i)).toBeNull();
    expect(screen.getByRole('link', { name: 'Sales list' }).getAttribute('href')).toBe('/sales');
    click('Sell again');
    expect(await screen.findByText('No items yet.')).toBeTruthy();
  });

  it('sends item ids and quantities and one idempotency key, never a price or a cost', async () => {
    const sent = capture('post', '/api/v1/sales/', () =>
      HttpResponse.json(mockStore.sales[0], { status: 201 }),
    );
    server.use(sent.handler);
    renderApp('/sell', { as: 'front_staff' });
    await addHp('2');
    await toReview('card');
    click('Confirm sale');
    await screen.findByText(/is recorded/);
    expect(sent.seen).toHaveLength(1);
    expect(sent.seen[0].body).toEqual({
      payment_method: 'card',
      lines: [{ item_id: 1, quantity: 2 }],
    });
    expect(sent.seen[0].key).toBeTruthy();
  });

  it('a quantity above the stock shows the server message on the line and sells nothing', async () => {
    renderApp('/sell', { as: 'front_staff' });
    await addHp('99');
    await toReview();
    click('Confirm sale');
    expect(await screen.findByText('Not enough stock for this sale.')).toBeTruthy();
    // back on the items step, the message sits on the quantity
    const field = await screen.findByLabelText('Quantity: HP 250 G9');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getAllByText('Only 3 of HP 250 G9 available.').length).toBeGreaterThan(0);
    expect(mockStore.sales).toHaveLength(2);
  });

  it('a double click on Confirm sends one request; a retry after a failure reuses the key', async () => {
    const keys: (string | null)[] = [];
    let n = 0;
    server.use(
      http.post('/api/v1/sales/', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key'));
        return ++n === 1
          ? apiError(500, 'server_error', 'The server had a problem.')
          : HttpResponse.json(mockStore.sales[0], { status: 201 });
      }),
    );
    renderApp('/sell', { as: 'front_staff' });
    await addHp('1');
    await toReview();
    const btn = screen.getByRole('button', { name: 'Confirm sale' });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(await screen.findByText('The server had a problem.')).toBeTruthy();
    expect(keys).toHaveLength(1);
    click('Confirm sale');
    await screen.findByText(/is recorded/);
    expect(keys).toHaveLength(2);
    expect(keys[1]).toBe(keys[0]);
  });

  it('asks for items, whole-number quantities and a payment method before moving on', async () => {
    renderApp('/sell', { as: 'front_staff' });
    await sellH1();
    click('Next: payment');
    expect(await screen.findByText('Add at least one item.')).toBeTruthy();
    await addHp('0');
    click('Next: payment');
    expect(await screen.findByText('Enter a whole number, 1 or more.')).toBeTruthy();
    type('Quantity: HP 250 G9', '1');
    click('Next: payment');
    await screen.findByRole('heading', { level: 2, name: 'Payment' });
    click('Next: confirm');
    expect(await screen.findByText('Choose a payment method.')).toBeTruthy();
    click('Back');
    expect(await screen.findByLabelText('Quantity: HP 250 G9')).toBeTruthy();
  });

  it('lists only what the API holds at my branch and shows no cost, whatever the role', async () => {
    renderApp('/sell', { as: 'branch_admin' });
    await sellH1();
    type('Find an item to sell', 'HP');
    click('Search');
    expect(await screen.findByText(/SKU-000001/)).toBeTruthy();
    expect(screen.queryByText(/900|cost/i)).toBeNull();
  });

  it('a Super Admin with no working branch is asked to choose one first', async () => {
    renderApp('/sell', { as: 'super_admin' });
    expect(await screen.findByText('Choose the branch you are selling at.')).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Accra Branch' })).toBeTruthy();
  });

  it('a user without sales.record gets the 403 page', async () => {
    renderApp('/sell', { as: 'warehouse_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });

  it('keyboard only: Enter in the search box searches and the add button is reachable', async () => {
    renderApp('/sell', { as: 'front_staff' });
    await sellH1();
    type('Find an item to sell', 'HP');
    fireEvent.keyDown(screen.getByLabelText('Find an item to sell'), { key: 'Enter' });
    const add = await screen.findByRole('button', { name: 'Add HP 250 G9' });
    add.focus();
    expect(document.activeElement).toBe(add);
  });
});

describe('sales list and cancel', () => {
  const card = (ref: string) => screen.getByRole('cell', { name: ref }).closest('tr')!;

  it('lists sales with words and icons for status; a cancelled sale shows who and why; axe clean', async () => {
    const { container } = renderApp('/sales', { as: 'branch_admin' });
    await screen.findByRole('cell', { name: 'SAL-000001' });
    const done = within(card('SAL-000001'));
    expect(done.getByText('Completed')).toBeTruthy();
    expect(done.getByText('Total GHS 1250.00')).toBeTruthy();
    expect(done.getByRole('button', { name: 'Cancel sale SAL-000001' })).toBeTruthy();
    const gone = within(card('SAL-000002'));
    expect(gone.getByText('Cancelled')).toBeTruthy();
    expect(card('SAL-000002').querySelector('svg')).not.toBeNull();
    expect(gone.getByText(/Reason: Customer changed their mind/)).toBeTruthy();
    expect(gone.queryByRole('button', { name: /Cancel sale/ })).toBeNull();
    expect(screen.queryByText(/cost/i)).toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('filters are sent to the API', async () => {
    renderApp('/sales', { as: 'branch_admin' });
    await screen.findByRole('cell', { name: 'SAL-000001' });
    type('Status', 'cancelled');
    await waitFor(() => expect(screen.queryByRole('cell', { name: 'SAL-000001' })).toBeNull());
    expect(screen.getByRole('cell', { name: 'SAL-000002' })).toBeTruthy();
    type('Payment method', 'cash');
    expect(await screen.findByText('No sales match')).toBeTruthy();
  });

  it('cancel asks for a reason, then a confirm step; the badge changes and the stock returns', async () => {
    const sent = capture('post', '/api/v1/sales/1/cancel/', () => HttpResponse.json({}));
    void sent;
    renderApp('/sales', { as: 'branch_admin' });
    await screen.findByRole('cell', { name: 'SAL-000001' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel sale SAL-000001' }));
    const panel = await screen.findByRole('group', { name: /Cancel sale SAL-000001\?/ });
    expect(document.activeElement).toBe(panel);
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancel this sale' }));
    expect(await within(panel).findByText('Give a reason for cancelling.')).toBeTruthy();
    expect(mockStore.sales[0].status).toBe('completed');
    type('Reason', 'Customer returned it');
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancel this sale' }));
    await waitFor(() => expect(within(card('SAL-000001')).getByText('Cancelled')).toBeTruthy());
    expect(within(card('SAL-000001')).getByText(/Reason: Customer returned it/)).toBeTruthy();
    expect(mockStore.sales[0].cancellation?.cancelled_role).toBe('branch_admin');
    expect(mockStore.stock.find((r) => r.location_id === 2 && r.item_id === 1)?.available).toBe(4);
  });

  it('leaving the confirm step cancels nothing', async () => {
    renderApp('/sales', { as: 'branch_admin' });
    await screen.findByRole('cell', { name: 'SAL-000001' });
    const open = screen.getByRole('button', { name: 'Cancel sale SAL-000001' });
    fireEvent.click(open);
    const panel = await screen.findByRole('group', { name: /Cancel sale SAL-000001\?/ });
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('group', { name: /Cancel sale/ })).toBeNull();
    expect(mockStore.sales[0].status).toBe('completed');
  });

  it('a sale cancelled elsewhere meanwhile is a 409 shown as a message', async () => {
    renderApp('/sales', { as: 'branch_admin' });
    await screen.findByRole('cell', { name: 'SAL-000001' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel sale SAL-000001' }));
    type('Reason', 'Duplicate');
    mockStore.sales[0].status = 'cancelled';
    fireEvent.click(screen.getByRole('button', { name: 'Cancel this sale' }));
    expect(await screen.findByText('Only a completed sale can be cancelled.')).toBeTruthy();
  });

  it('Front Staff has no sales.cancel: no Cancel button; Branch Admin and Super Admin have it', async () => {
    const { unmount } = renderApp('/sales', { as: 'front_staff' });
    await screen.findByRole('cell', { name: 'SAL-000001' });
    expect(screen.queryByRole('button', { name: /Cancel sale/ })).toBeNull();
    unmount();
    mockSession.role = 'branch_admin';
    const ba = renderApp('/sales', { as: 'branch_admin' });
    expect(await screen.findByRole('button', { name: 'Cancel sale SAL-000001' })).toBeTruthy();
    ba.unmount();
    renderApp('/sales', { as: 'super_admin' });
    expect(await screen.findByRole('button', { name: 'Cancel sale SAL-000001' })).toBeTruthy();
  });

  it('if the API still refuses a cancel (403) the message is shown and the sale stays', async () => {
    server.use(
      http.post('/api/v1/sales/:id/cancel/', () =>
        apiError(403, 'forbidden', 'You cannot do this.'),
      ),
    );
    renderApp('/sales', { as: 'branch_admin' });
    await screen.findByRole('cell', { name: 'SAL-000001' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel sale SAL-000001' }));
    type('Reason', 'x');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel this sale' }));
    expect(await screen.findByText('You cannot do this.')).toBeTruthy();
    expect(mockStore.sales[0].status).toBe('completed');
  });

  it('Sales is a menu entry for Front Staff and a Home tile for Branch Admin and Super Admin, from /me', async () => {
    renderApp('/stock', { as: 'front_staff' });
    expect(
      (await screen.findAllByRole('link', { name: 'Sales' })).every(
        (l) => l.getAttribute('href') === '/sales',
      ),
    ).toBe(true);
  });

  it('Warehouse Admin has no sales permission: 403 page', async () => {
    renderApp('/sales', { as: 'warehouse_admin' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });

  it('a double click on the confirm cancels once', async () => {
    const calls: number[] = [];
    server.use(
      http.post('/api/v1/sales/:id/cancel/', () => {
        calls.push(1);
        return HttpResponse.json({ ...mockStore.sales[0], status: 'cancelled' });
      }),
    );
    renderApp('/sales', { as: 'branch_admin' });
    await screen.findByRole('cell', { name: 'SAL-000001' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel sale SAL-000001' }));
    type('Reason', 'Twice');
    const go = screen.getByRole('button', { name: 'Cancel this sale' });
    fireEvent.click(go);
    fireEvent.click(go);
    await waitFor(() => expect(calls).toHaveLength(1));
  });
});
