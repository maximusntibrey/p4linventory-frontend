import { describe, expect, it } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { components } from './api';
import * as d from './mocks/data';
import { commitCsv, mockSession, mockStore } from './mocks/handlers';
import { server } from './mocks/server';
import { click, type } from './test/helpers';
import { renderApp } from './test/renderApp';

const sale = (ref: string) => screen.getByRole('cell', { name: ref }).closest('tr')!;

describe('FIX-41: cancelling a sale keeps focus and announces the result', () => {
  it('after the confirm, focus is not lost and a status says which sale was cancelled', async () => {
    renderApp('/sales', { as: 'branch_admin' });
    await screen.findByRole('cell', { name: 'SAL-000001' });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel sale SAL-000001' }));
    type('Reason', 'Wrong item');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel this sale' }));
    const note = await screen.findByText('Sale SAL-000001 is cancelled.');
    expect(note.closest('[role="status"]')).not.toBeNull();
    await waitFor(() => expect(document.activeElement).not.toBe(document.body));
    expect(document.body.contains(document.activeElement)).toBe(true);
  });

  it('Cancel in the panel returns focus to the opener inside the same sale card', async () => {
    renderApp('/sales', { as: 'branch_admin' });
    await screen.findByRole('cell', { name: 'SAL-000001' });
    const open = screen.getByRole('button', { name: 'Cancel sale SAL-000001' });
    open.focus();
    fireEvent.click(open);
    const panel = await screen.findByRole('group', { name: /Cancel sale SAL-000001\?/ });
    fireEvent.click(within(panel).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(sale('SAL-000001').contains(document.activeElement)).toBe(true));
    expect(document.activeElement).not.toBe(document.body);
  });
});

describe('FIX-42: import file input is cleared when the confirm is cancelled', () => {
  const pick = () =>
    fireEvent.change(screen.getByLabelText(/CSV file/), {
      target: { files: [new File(['sku\nA'], 'stock.csv', { type: 'text/csv' })] },
    });
  it('the input is empty after Cancel, and choosing the same file again sends a dry run', async () => {
    let calls = 0;
    const clean: components['schemas']['ItemImportReport'] = {
      dry_run: true,
      committed: false,
      batch_reference: null,
      location_id: 1,
      rows: 1,
      items_created: 0,
      items_existing: 1,
      opening_quantity_total: 1,
      errors: [],
    };
    server.use(
      http.post('/api/v1/item-imports/', () => {
        calls += 1;
        return HttpResponse.json(clean);
      }),
    );
    renderApp('/items/import', { as: 'warehouse_admin' });
    await screen.findByRole('heading', { level: 1, name: 'Import from CSV' });
    pick();
    click('Check the file');
    await screen.findByRole('button', { name: 'Import now' });
    click('Cancel');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Import now' })).toBeNull());
    expect((screen.getByLabelText(/CSV file/) as HTMLInputElement).files).toHaveLength(0);
    pick();
    click('Check the file');
    expect(await screen.findByRole('button', { name: 'Import now' })).toBeTruthy();
    expect(calls).toBe(2);
  });
});

describe('FIX-43: an unpriced line is said so, and a 400 on a line returns to the items step', () => {
  async function addHp() {
    await screen.findByRole('heading', { level: 1, name: 'Sell' });
    type('Find an item to sell', 'HP');
    click('Search');
    fireEvent.click(await screen.findByRole('button', { name: 'Add HP 250 G9' }));
    await screen.findByLabelText('Quantity: HP 250 G9');
  }
  it('the running total says how many lines have no price; the server 400 shows on the line', async () => {
    mockStore.items[0] = { ...mockStore.items[0], selling_price: null };
    renderApp('/sell', { as: 'front_staff' });
    await addHp();
    expect(screen.getByText(/1 item has no price yet/)).toBeTruthy();
    click('Next: payment');
    await screen.findByRole('heading', { level: 2, name: 'Payment' });
    type('Payment method', 'cash');
    click('Next: confirm');
    await screen.findByRole('heading', { level: 2, name: 'Confirm sale' });
    click('Confirm sale');
    const field = await screen.findByLabelText('Quantity: HP 250 G9');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getAllByText('This item has no price yet.').length).toBeGreaterThan(0);
    expect(mockStore.sales).toHaveLength(2);
  });
});

describe('FIX-44: a line error follows its item, not its position', () => {
  it('409 on the second line, then removing the first: the error stays on the Dell line', async () => {
    mockStore.items[1] = { ...mockStore.items[1], status: 'active', selling_price: '500.00' };
    mockStore.stock.push({
      location_id: d.branchA.id,
      location_name: d.branchA.name,
      item_id: 2,
      sku: 'SKU-000002',
      item_name: 'Dell 65W charger',
      on_hand: 1,
      reserved: 0,
      available: 1,
      quarantined: 0,
      reorder_level: null,
      low_stock: false,
    });
    renderApp('/sell', { as: 'front_staff' });
    await screen.findByRole('heading', { level: 1, name: 'Sell' });
    for (const [q, name] of [
      ['HP', 'HP 250 G9'],
      ['Dell', 'Dell 65W charger'],
    ]) {
      type('Find an item to sell', q);
      click('Search');
      fireEvent.click(await screen.findByRole('button', { name: `Add ${name}` }));
      await screen.findByLabelText(`Quantity: ${name}`);
    }
    type('Quantity: Dell 65W charger', '5');
    click('Next: payment');
    await screen.findByRole('heading', { level: 2, name: 'Payment' });
    type('Payment method', 'cash');
    click('Next: confirm');
    click('Confirm sale');
    const dell = await screen.findByLabelText('Quantity: Dell 65W charger');
    expect(dell.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('Quantity: HP 250 G9').getAttribute('aria-invalid')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove HP 250 G9' }));
    expect(screen.queryByLabelText('Quantity: HP 250 G9')).toBeNull();
    expect(screen.getByLabelText('Quantity: Dell 65W charger').getAttribute('aria-invalid')).toBe(
      'true',
    );
    expect(screen.getAllByText('Only 1 of Dell 65W charger available.').length).toBeGreaterThan(0);
  });

  it('a format problem on a quantity goes away with its line and does not move to the next one', async () => {
    renderApp('/sell', { as: 'front_staff' });
    await screen.findByRole('heading', { level: 1, name: 'Sell' });
    type('Find an item to sell', 'HP');
    click('Search');
    fireEvent.click(await screen.findByRole('button', { name: 'Add HP 250 G9' }));
    await screen.findByLabelText('Quantity: HP 250 G9');
    type('Quantity: HP 250 G9', '0');
    click('Next: payment');
    expect(await screen.findByText('Enter a whole number, 1 or more.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Remove HP 250 G9' }));
    expect(screen.queryByText('Enter a whole number, 1 or more.')).toBeNull();
  });
});

describe('FIX-45: Find keeps the other-branches panel per location and item', () => {
  it('two locations of the same item open one at a time', async () => {
    renderApp('/find', { as: 'super_admin' });
    await screen.findByText('Central Warehouse:');
    const buttons = await screen.findAllByRole('button', { name: /other branches for HP 250 G9/ });
    expect(buttons.length).toBeGreaterThan(1);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(buttons[0].getAttribute('aria-expanded')).toBe('true'));
    expect(buttons[1].getAttribute('aria-expanded')).toBe('false');
  });
});

describe('FIX-46: a committed import changes what the mock shows', () => {
  it('adds Draft items and opening stock; stock and items lists show them', async () => {
    mockSession.loggedIn = true;
    mockSession.role = 'warehouse_admin';
    const csv =
      'sku,name,category,condition,opening_quantity,unit_cost\n' +
      'SKU-000001,,,,5,900.00\n' +
      ',Lenovo T14,Laptop,used,3,700.00';
    const before = mockStore.stock.find((r) => r.location_id === 1 && r.item_id === 1)!.on_hand;
    commitCsv(csv, d.warehouse.id);
    const get = async (path: string) =>
      (await fetch(new URL(path, globalThis.location.origin))).json();
    const stock = await get('/api/v1/stock/?q=Lenovo');
    expect(stock.results).toHaveLength(1);
    expect(stock.results[0]).toMatchObject({ location_id: 1, on_hand: 3, available: 3 });
    const hp = await get('/api/v1/stock/?q=SKU-000001');
    expect(hp.results.find((r: { location_id: number }) => r.location_id === 1).on_hand).toBe(
      before + 5,
    );
    const items = await get('/api/v1/items/?q=Lenovo');
    expect(items.results[0]).toMatchObject({ name: 'Lenovo T14', status: 'draft' });
    expect(items.results[0].selling_price).toBeNull();
  });
});
