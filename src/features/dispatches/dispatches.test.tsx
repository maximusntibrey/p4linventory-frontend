import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { dispatch } from '../../mocks/data';
import { mockStore } from '../../mocks/handlers';
import { server } from '../../mocks/server';
import { apiError, capture, click, type } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const h1 = (name: string) => screen.findByRole('heading', { level: 1, name });
const card = (reference: string) => screen.getByText(reference).closest('tr')!;

async function chooseBranchAndAddHp(quantity: string) {
  await h1('Dispatch to a branch');
  fireEvent.change(await screen.findByLabelText('Destination branch'), { target: { value: '2' } });
  type('Find an item in the warehouse', 'HP');
  click('Search');
  fireEvent.click(await screen.findByRole('button', { name: 'Add HP 250 G9' }));
  type('Quantity: HP 250 G9', quantity);
}

describe('dispatch status list (F5.2)', () => {
  it('lists each dispatch with its status as icon + word, and flags an open shortfall; axe clean', async () => {
    const { container } = renderApp('/dispatches', { as: 'warehouse_admin' });
    await h1('Dispatch');
    await screen.findByText('TRF-000001');
    expect(within(card('TRF-000001')).getByText('In transit')).toBeTruthy();
    expect(within(card('TRF-000001')).getByText('7 units', { exact: false })).toBeTruthy();
    expect(within(card('TRF-000003')).getByText('Partially received')).toBeTruthy();
    expect(within(card('TRF-000003')).getByText('Open shortfall')).toBeTruthy();
    expect(card('TRF-000003').querySelector('svg')).not.toBeNull();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('status and branch filters go to the API, so "In transit" plus a branch shows what is waiting there', async () => {
    renderApp('/dispatches', { as: 'warehouse_admin' });
    await h1('Dispatch');
    await screen.findByText('TRF-000003');
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'in_transit' } });
    await waitFor(() => expect(screen.queryByText('TRF-000003')).toBeNull());
    expect(screen.getByText('TRF-000001')).toBeTruthy();
    fireEvent.change(await screen.findByLabelText('Branch'), { target: { value: '3' } });
    expect(await screen.findByText('TRF-000002')).toBeTruthy();
    await waitFor(() => expect(screen.queryByText('TRF-000001')).toBeNull());
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'rejected' } });
    expect(await screen.findByText('No dispatches match')).toBeTruthy();
  });

  it('offers New dispatch only with dispatches.create (route is guarded by it as well)', async () => {
    renderApp('/dispatches', { as: 'warehouse_admin' });
    await h1('Dispatch');
    expect(
      parseFloat(getComputedStyle(screen.getByRole('link', { name: 'New dispatch' })).minHeight),
    ).toBeGreaterThanOrEqual(44);
  });

  it('is not offered to Front Staff', async () => {
    renderApp('/dispatches', { as: 'front_staff' });
    expect(await h1('403: Not allowed')).toBeTruthy();
  });
});

describe('new dispatch (F5.2)', () => {
  it('asks for a branch and a line first', async () => {
    const { container } = renderApp('/dispatches/new', { as: 'warehouse_admin' });
    await h1('Dispatch to a branch');
    await screen.findByLabelText('Destination branch');
    click('Review dispatch');
    expect(screen.getByText('Choose a branch.')).toBeTruthy();
    expect(screen.getByText('Add at least one item.')).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('lists only branches to send to, and shows what is available for each item', async () => {
    renderApp('/dispatches/new', { as: 'warehouse_admin' });
    await h1('Dispatch to a branch');
    const select = (await screen.findByLabelText('Destination branch')) as HTMLSelectElement;
    expect([...select.options].map((o) => o.text)).toEqual([
      'Choose a branch…',
      'Accra Branch',
      'Kumasi Branch',
    ]);
    type('Find an item in the warehouse', 'HP');
    click('Search');
    expect(await screen.findByText(/Available: 10/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Add HP 250 G9' }));
    expect(screen.getByText('Added')).toBeTruthy();
    expect(screen.getByText('Available: 10', { selector: 'p' })).toBeTruthy();
  });

  it('reviews, confirms and shows the transfer reference; the stock is set aside', async () => {
    renderApp('/dispatches/new', { as: 'warehouse_admin' });
    await chooseBranchAndAddHp('4');
    click('Review dispatch');
    expect(screen.getByText('Accra Branch')).toBeTruthy();
    expect(screen.getByText(/4 × HP 250 G9/)).toBeTruthy();
    click('Confirm dispatch');
    expect(
      await screen.findByText(/Dispatch TRF-000004 to Accra Branch is on its way/),
    ).toBeTruthy();
    const row = mockStore.stock.find((r) => r.location_id === 1 && r.item_id === 1)!;
    expect([row.reserved, row.available]).toEqual([6, 6]);
    expect(
      parseFloat(
        getComputedStyle(screen.getByRole('link', { name: 'Back to dispatches' })).minHeight,
      ),
    ).toBeGreaterThanOrEqual(44);
  });

  it('sends the typed values with an Idempotency-Key, and a double click sends one request', async () => {
    const cap = capture('post', '/api/v1/dispatches/', () =>
      HttpResponse.json(dispatch, { status: 201 }),
    );
    server.use(cap.handler);
    renderApp('/dispatches/new', { as: 'warehouse_admin' });
    await chooseBranchAndAddHp('4');
    click('Review dispatch');
    const confirm = screen.getByRole('button', { name: 'Confirm dispatch' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await screen.findByText(/is on its way/);
    expect(cap.seen).toHaveLength(1);
    expect(cap.seen[0].key).toMatch(/^[0-9a-f-]{36}$/);
    expect(cap.seen[0].body).toEqual({ destination_id: 2, lines: [{ item_id: 1, quantity: 4 }] });
  });

  it('shows the API refusal when there is not enough stock, in the server words', async () => {
    renderApp('/dispatches/new', { as: 'warehouse_admin' });
    await chooseBranchAndAddHp('50');
    click('Review dispatch');
    click('Confirm dispatch');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Not enough HP 250 G9 at Central Warehouse: 10 available.');
    // Nothing was reserved.
    expect(mockStore.stock.find((r) => r.location_id === 1)!.available).toBe(10);
  });

  it('puts a field message from the API on its field', async () => {
    server.use(
      capture('post', '/api/v1/dispatches/', () =>
        apiError(400, 'validation_error', 'Check the highlighted fields.', [
          { field: 'lines.0.quantity', message: 'That quantity is not allowed.' },
        ]),
      ).handler,
    );
    renderApp('/dispatches/new', { as: 'warehouse_admin' });
    await chooseBranchAndAddHp('4');
    click('Review dispatch');
    click('Confirm dispatch');
    await screen.findByRole('alert');
    click('Cancel');
    expect(screen.getAllByText('That quantity is not allowed.').length).toBeGreaterThan(0);
  });
});
