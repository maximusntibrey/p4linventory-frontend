import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { warehouse } from '../../mocks/data';
import { mockSession, mockStore } from '../../mocks/handlers';
import { server } from '../../mocks/server';
import { apiError, capture, click, type } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const north = { ...warehouse, id: 9, code: 'NW', name: 'North Warehouse' };
const addNorth = () => {
  mockStore.branches.push(north);
  const hp = mockStore.stock.find(
    (r) => r.location_id === warehouse.id && r.item_name === 'HP 250 G9',
  )!;
  mockStore.stock.push({ ...structuredClone(hp), location_id: 9, location_name: north.name });
};
const pickWarehouse = async (id: string) =>
  fireEvent.change(await screen.findByLabelText('Warehouse'), { target: { value: id } });

async function fillReceipt() {
  await screen.findByRole('heading', { level: 1, name: 'Receive stock' });
  type('Supplier', 'Accra Wholesale');
  type('Find an item to receive', 'HP');
  click('Search');
  fireEvent.click(await screen.findByRole('button', { name: 'Add HP 250 G9' }));
  type('Quantity: HP 250 G9', '4');
  type('Unit cost (GHS): HP 250 G9', '900');
}
async function fillDispatch(warehouseId?: string) {
  await screen.findByRole('heading', { level: 1, name: 'Dispatch to a branch' });
  if (warehouseId) await pickWarehouse(warehouseId);
  fireEvent.change(await screen.findByLabelText('Destination branch'), { target: { value: '2' } });
  type('Find an item in the warehouse', 'HP');
  click('Search');
  fireEvent.click(await screen.findByRole('button', { name: 'Add HP 250 G9' }));
  type('Quantity: HP 250 G9', '1');
}

describe('goods receipt with several warehouses (contract 0.7.0)', () => {
  it('shows a required Warehouse select, sends warehouse_id and receives into each warehouse', async () => {
    addNorth();
    const { container } = renderApp('/goods-receipts', { as: 'super_admin' });
    await fillReceipt();
    expect(await axe(container)).toHaveNoViolations();
    click('Review receipt');
    expect(screen.getByText('Choose a warehouse.')).toBeTruthy();
    for (const id of [9, 1]) {
      await pickWarehouse(String(id));
      click('Review receipt');
      click('Confirm receipt');
      await screen.findByText(/is confirmed/);
      expect(mockStore.receipts.at(-1)!.location_id).toBe(id);
      click('Receive another delivery');
      await fillReceipt();
    }
  });

  it('hides the select with one warehouse and omits warehouse_id', async () => {
    const post = capture('post', '/api/v1/goods-receipts/', () =>
      HttpResponse.json(mockStore.receipts[0], { status: 201 }),
    );
    server.use(post.handler);
    renderApp('/goods-receipts', { as: 'super_admin' });
    await fillReceipt();
    expect(screen.queryByLabelText('Warehouse')).toBeNull();
    click('Review receipt');
    click('Confirm receipt');
    await waitFor(() => expect(post.seen).toHaveLength(1));
    expect(post.seen[0].body).not.toHaveProperty('warehouse_id');
  });

  it('a Warehouse Admin picking another warehouse gets the 403 wrong_branch message', async () => {
    addNorth();
    renderApp('/goods-receipts', { as: 'warehouse_admin' });
    await fillReceipt();
    await pickWarehouse('9');
    click('Review receipt');
    click('Confirm receipt');
    expect((await screen.findByRole('alert')).textContent).toContain(
      'You can only work in your own warehouse.',
    );
  });

  it('shows the server 400 on the Warehouse field', async () => {
    addNorth();
    server.use(
      capture('post', '/api/v1/goods-receipts/', () =>
        apiError(400, 'validation_error', 'Check the highlighted fields.', [
          { field: 'warehouse_id', message: 'Choose an active warehouse.' },
        ]),
      ).handler,
    );
    renderApp('/goods-receipts', { as: 'super_admin' });
    await fillReceipt();
    await pickWarehouse('9');
    click('Review receipt');
    click('Confirm receipt');
    expect((await screen.findAllByText('Choose an active warehouse.')).length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Warehouse').getAttribute('aria-invalid')).toBe('true');
  });
});

describe('dispatch with several warehouses (contract 0.7.0)', () => {
  it('shows a required Warehouse select and dispatches from each warehouse', async () => {
    addNorth();
    const { container } = renderApp('/dispatches/new', { as: 'super_admin' });
    await screen.findByLabelText('Warehouse');
    expect(await axe(container)).toHaveNoViolations();
    click('Review dispatch');
    expect(screen.getByText('Choose a warehouse.')).toBeTruthy();
    for (const id of [9, 1]) {
      await fillDispatch(String(id));
      click('Review dispatch');
      click('Confirm dispatch');
      await screen.findByText(/is on its way/);
      expect(mockStore.dispatches.at(-1)!.origin.id).toBe(id);
      click('Dispatch more stock');
    }
  });

  it('hides the select with one warehouse and omits warehouse_id', async () => {
    const post = capture('post', '/api/v1/dispatches/', () =>
      HttpResponse.json(mockStore.dispatches[0], { status: 201 }),
    );
    server.use(post.handler);
    renderApp('/dispatches/new', { as: 'super_admin' });
    await fillDispatch();
    expect(screen.queryByLabelText('Warehouse')).toBeNull();
    click('Review dispatch');
    click('Confirm dispatch');
    await waitFor(() => expect(post.seen).toHaveLength(1));
    expect(post.seen[0].body).not.toHaveProperty('warehouse_id');
  });
});

describe('mock API rules for warehouse_id', () => {
  const post = (body: object) =>
    fetch('/api/v1/goods-receipts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
        'X-CSRFToken': 't',
      },
      body: JSON.stringify(body),
    });
  const lines = [{ item_id: 1, quantity: 1, unit_cost: '10.00' }];

  it('omitted with several warehouses is 400; unknown or a branch is 400', async () => {
    addNorth();
    mockSession.loggedIn = true;
    mockSession.role = 'super_admin';
    for (const warehouse_id of [undefined, 999, 2]) {
      const res = await post({ supplier_name: 'S', lines, warehouse_id });
      expect(res.status).toBe(400);
      expect((await res.json()).errors[0].field).toBe('warehouse_id');
    }
  });
});
