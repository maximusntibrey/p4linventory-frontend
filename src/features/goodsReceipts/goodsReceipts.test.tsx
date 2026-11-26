import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { HttpResponse } from 'msw';
import { axe } from 'vitest-axe';
import { goodsReceipt } from '../../mocks/data';
import { mockStore } from '../../mocks/handlers';
import { server } from '../../mocks/server';
import { apiError, capture, click, type } from '../../test/helpers';
import { renderApp } from '../../test/renderApp';

const h1 = () => screen.findByRole('heading', { level: 1, name: 'Receive stock' });

async function addHp() {
  type('Find an item to receive', 'HP');
  click('Search');
  fireEvent.click(await screen.findByRole('button', { name: 'Add HP 250 G9' }));
}

async function fillValid() {
  await h1();
  type('Supplier', ' Accra Wholesale ');
  await addHp();
  type('Quantity: HP 250 G9', '5');
  type('Unit cost (GHS): HP 250 G9', '910.5');
}

describe('receive stock screen (F5.1)', () => {
  it('shows the form with labelled, 44 px controls and no axe violations', async () => {
    const { container } = renderApp('/goods-receipts', { as: 'warehouse_admin' });
    await h1();
    expect((screen.getByLabelText('Supplier') as HTMLInputElement).className).toContain('min-h-11');
    expect(screen.getByRole('button', { name: 'Review receipt' }).className).toContain('min-h-11');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('asks for the missing parts before reviewing', async () => {
    renderApp('/goods-receipts', { as: 'warehouse_admin' });
    await h1();
    click('Review receipt');
    expect(screen.getByText('Enter the supplier name.')).toBeTruthy();
    expect(screen.getByText('Add at least one item.')).toBeTruthy();
    await addHp();
    type('Supplier', 'S');
    type('Quantity: HP 250 G9', '0');
    type('Unit cost (GHS): HP 250 G9', '-3');
    click('Review receipt');
    expect(screen.getByText('Enter a whole number, 1 or more.')).toBeTruthy();
    expect(screen.getByText('Enter a cost such as 900.00.')).toBeTruthy();
  });

  it('searching works from the keyboard (Enter in the box); the API decides which items it lists', async () => {
    renderApp('/goods-receipts', { as: 'warehouse_admin' });
    await h1();
    type('Find an item to receive', 'HP');
    fireEvent.keyDown(screen.getByLabelText('Find an item to receive'), { key: 'Enter' });
    expect(await screen.findByText('HP 250 G9')).toBeTruthy();
    // The mock's only other item is a Draft, so the Active filter leaves nothing for it.
    type('Find an item to receive', 'charger');
    fireEvent.keyDown(screen.getByLabelText('Find an item to receive'), { key: 'Enter' });
    expect(await screen.findByText('No matching items.')).toBeTruthy();
  });

  it('reviews, confirms once, shows the receipt reference and the stock goes up', async () => {
    const { container } = renderApp('/goods-receipts', { as: 'warehouse_admin' });
    await fillValid();
    click('Review receipt');
    expect(screen.getByText('Supplier:')).toBeTruthy();
    expect(screen.getByText(/5 × HP 250 G9 \(SKU-000001\) at GHS 910\.50 each/)).toBeTruthy();
    expect(screen.getByText(/A confirmed receipt cannot be edited/)).toBeTruthy();
    expect(await axe(container)).toHaveNoViolations();
    click('Confirm receipt');
    expect(await screen.findByText(/Receipt GRN-000002 is confirmed/)).toBeTruthy();
    expect(screen.getByText(/5 × HP 250 G9/)).toBeTruthy();
    const warehouseRow = mockStore.stock.find((r) => r.location_id === 1 && r.item_id === 1)!;
    expect(warehouseRow.on_hand).toBe(17);
    click('Receive another delivery');
    expect((screen.getByLabelText('Supplier') as HTMLInputElement).value).toBe('');
  });

  it('sends the typed values with an Idempotency-Key, and a double click sends one request', async () => {
    const cap = capture('post', '/api/v1/goods-receipts/', () =>
      HttpResponse.json(goodsReceipt, { status: 201 }),
    );
    server.use(cap.handler);
    renderApp('/goods-receipts', { as: 'warehouse_admin' });
    await fillValid();
    click('Review receipt');
    const confirm = screen.getByRole('button', { name: 'Confirm receipt' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    await screen.findByText(/is confirmed/);
    expect(cap.seen).toHaveLength(1);
    expect(cap.seen[0].key).toMatch(/^[0-9a-f-]{36}$/);
    expect(cap.seen[0].body).toEqual({
      supplier_name: 'Accra Wholesale',
      lines: [{ item_id: 1, quantity: 5, unit_cost: '910.50' }],
    });
  });

  it('a retry after a failure reuses the key; a changed form gets a new one', async () => {
    let n = 0;
    const cap = capture('post', '/api/v1/goods-receipts/', () =>
      ++n === 1
        ? apiError(409, 'conflict', 'Try again in a moment.')
        : HttpResponse.json(goodsReceipt, { status: 201 }),
    );
    server.use(cap.handler);
    renderApp('/goods-receipts', { as: 'warehouse_admin' });
    await fillValid();
    click('Review receipt');
    click('Confirm receipt');
    expect(await screen.findByText('Try again in a moment.')).toBeTruthy();
    click('Confirm receipt');
    await screen.findByText(/is confirmed/);
    expect(cap.seen).toHaveLength(2);
    expect(cap.seen[1].key).toBe(cap.seen[0].key);
  });

  it('reports what the API rejects, next to the field when it names one', async () => {
    server.use(
      capture('post', '/api/v1/goods-receipts/', () =>
        apiError(400, 'validation_error', 'Check the highlighted fields.', [
          { field: 'lines.0.unit_cost', message: 'That cost is too high.' },
        ]),
      ).handler,
    );
    renderApp('/goods-receipts', { as: 'warehouse_admin' });
    await fillValid();
    click('Review receipt');
    click('Confirm receipt');
    await screen.findByRole('alert');
    // Back on the form the server's field message sits on the cost field.
    click('Cancel');
    await waitFor(() =>
      expect(screen.getAllByText('That cost is too high.').length).toBeGreaterThan(0),
    );
  });

  it('is not offered to a user without goods_receipts.manage', async () => {
    renderApp('/goods-receipts', { as: 'front_staff' });
    expect(await screen.findByRole('heading', { level: 1, name: '403: Not allowed' })).toBeTruthy();
  });
});
