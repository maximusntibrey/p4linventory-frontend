import { describe, expect, it } from 'vitest';
import { mockSession, mockStore } from './handlers';
import type { MockRole } from './data';
import { checkCsv } from './csvReport';

let seq = 0;
const send = (method: string, path: string, body?: unknown, key: string | null = 'new') =>
  fetch(new URL(path, globalThis.location.origin), {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': 't',
      ...(key && { 'Idempotency-Key': key === 'new' ? `s-${++seq}` : key }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const as = (role: MockRole) => {
  mockSession.loggedIn = true;
  mockSession.role = role;
};
const sale = (quantity = 1) => ({
  payment_method: 'cash',
  lines: [{ item_id: 1, quantity }],
});
const availableAtAccra = () =>
  mockStore.stock.find((r) => r.location_id === 2 && r.item_id === 1)!.available;

describe('sales mock enforces the contract', () => {
  it('records a sale: price from the price list, stock down, no cost in the answer', async () => {
    as('front_staff');
    const res = await send('POST', '/api/v1/sales/', sale(2));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ status: 'completed', total: '2500.00', cancellation: null });
    expect(JSON.stringify(body)).not.toMatch(/cost/i);
    expect(availableAtAccra()).toBe(1);
  });

  it('replays the same key and body (one sale), 409 for the same key with another body', async () => {
    as('front_staff');
    const first = await send('POST', '/api/v1/sales/', sale(1), 'same');
    const again = await send('POST', '/api/v1/sales/', sale(1), 'same');
    expect(again.status).toBe(201);
    expect((await again.json()).id).toBe((await first.json()).id);
    expect(mockStore.sales).toHaveLength(3);
    const other = await send('POST', '/api/v1/sales/', sale(2), 'same');
    expect(other.status).toBe(409);
    expect((await other.json()).code).toBe('idempotency_conflict');
  });

  it('a sale needs the Idempotency-Key header (400)', async () => {
    as('front_staff');
    expect((await send('POST', '/api/v1/sales/', sale(), null)).status).toBe(400);
  });

  it('409 insufficient_stock names the line and writes nothing', async () => {
    as('front_staff');
    const res = await send('POST', '/api/v1/sales/', sale(99));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.code).toBe('insufficient_stock');
    expect(body.errors[0]).toMatchObject({ field: 'lines.0.quantity' });
    expect(mockStore.sales).toHaveLength(2);
    expect(availableAtAccra()).toBe(3);
  });

  it('400 for a bad payment method, a duplicate item, an empty list and an item without a price', async () => {
    as('front_staff');
    expect(
      (await send('POST', '/api/v1/sales/', { ...sale(), payment_method: 'gold' })).status,
    ).toBe(400);
    expect(
      (await send('POST', '/api/v1/sales/', { payment_method: 'cash', lines: [] })).status,
    ).toBe(400);
    const dup = {
      payment_method: 'cash',
      lines: [
        { item_id: 1, quantity: 1 },
        { item_id: 1, quantity: 1 },
      ],
    };
    expect((await send('POST', '/api/v1/sales/', dup)).status).toBe(400);
    const noPrice = { payment_method: 'cash', lines: [{ item_id: 2, quantity: 1 }] };
    expect((await send('POST', '/api/v1/sales/', noPrice)).status).toBe(400);
  });

  it('403 for Warehouse Admin; 403 wrong_branch for a Super Admin with no working branch', async () => {
    as('warehouse_admin');
    expect((await send('POST', '/api/v1/sales/', sale())).status).toBe(403);
    expect((await send('GET', '/api/v1/sales/')).status).toBe(403);
    as('super_admin');
    const res = await send('POST', '/api/v1/sales/', sale());
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('wrong_branch');
  });

  it('lists newest first, filters by status, and refuses another branch (403 wrong_branch)', async () => {
    as('branch_admin');
    const all = await (await send('GET', '/api/v1/sales/')).json();
    expect(all.results.map((s: { reference: string }) => s.reference)).toEqual([
      'SAL-000002',
      'SAL-000001',
    ]);
    const done = await (await send('GET', '/api/v1/sales/?status=completed')).json();
    expect(done.count).toBe(1);
    const other = await send('GET', '/api/v1/sales/?branch=3');
    expect(other.status).toBe(403);
    expect((await other.json()).code).toBe('wrong_branch');
  });

  it('cancel: reason required, stock returns, then a second cancel is 409; replay of the first returns it', async () => {
    as('branch_admin');
    expect((await send('POST', '/api/v1/sales/1/cancel/', { reason: ' ' })).status).toBe(400);
    const res = await send('POST', '/api/v1/sales/1/cancel/', { reason: 'Wrong item' }, 'c1');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: 'cancelled',
      cancellation: { reason: 'Wrong item', cancelled_role: 'branch_admin' },
    });
    expect(availableAtAccra()).toBe(4);
    expect(
      (await send('POST', '/api/v1/sales/1/cancel/', { reason: 'Wrong item' }, 'c1')).status,
    ).toBe(200);
    expect(availableAtAccra()).toBe(4);
    const twice = await send('POST', '/api/v1/sales/1/cancel/', { reason: 'Again' });
    expect(twice.status).toBe(409);
    expect((await twice.json()).code).toBe('conflict');
  });

  it('cancel is 403 for Front Staff and Warehouse Admin, 404 for another branch and a missing id', async () => {
    as('front_staff');
    expect((await send('POST', '/api/v1/sales/1/cancel/', { reason: 'x' })).status).toBe(403);
    as('warehouse_admin');
    expect((await send('POST', '/api/v1/sales/1/cancel/', { reason: 'x' })).status).toBe(403);
    as('branch_admin');
    mockStore.sales[0].location = { ...mockStore.sales[0].location, id: 3 };
    expect((await send('POST', '/api/v1/sales/1/cancel/', { reason: 'x' })).status).toBe(404);
    expect((await send('GET', '/api/v1/sales/1/')).status).toBe(404);
    expect((await send('POST', '/api/v1/sales/99/cancel/', { reason: 'x' })).status).toBe(404);
  });
});

describe('checkCsv (the mock of the server dry run)', () => {
  const head = 'sku,name,category,condition,opening_quantity,unit_cost';
  it('counts new and existing items and the opening quantity', () => {
    const r = checkCsv(`${head}\nSKU-000001,,,,5,900.00\n,Dell 5420,Laptop,used,3,700`, [
      'SKU-000001',
    ]);
    expect(r).toMatchObject({
      rows: 2,
      items_existing: 1,
      items_created: 1,
      opening_quantity_total: 8,
      errors: [],
    });
  });
  it('reports errors with the CSV row number (header is row 1)', () => {
    const r = checkCsv(`${head}\nSKU-000001,,,,x,900.00\n,Dell,Laptop,used,3,abc\n,,,,1,1`, [
      'SKU-000001',
    ]);
    expect(r.errors.map((e) => [e.row, e.field])).toEqual([
      [2, 'opening_quantity'],
      [3, 'unit_cost'],
      [4, 'name'],
    ]);
  });
  it('flags a missing required column on row 1', () => {
    expect(checkCsv('sku,name\nA,B', []).errors[0]).toMatchObject({
      row: 1,
      field: 'opening_quantity',
    });
  });
});

describe('costed sales mock (contract 0.4.1)', () => {
  it('Super Admin gets the sales with unit_cost on each line; one sale by id; missing id is 404', async () => {
    as('super_admin');
    const list = await (await send('GET', '/api/v1/costed-sales/')).json();
    expect(list.count).toBe(2);
    expect(list.results[0].lines[0].unit_cost).toBe('900.00');
    const one = await (await send('GET', '/api/v1/costed-sales/1/')).json();
    expect(one).toMatchObject({ reference: 'SAL-000001' });
    expect((await send('GET', '/api/v1/costed-sales/99/')).status).toBe(404);
    const plain = await (await send('GET', '/api/v1/sales/')).json();
    expect(JSON.stringify(plain)).not.toContain('unit_cost');
  });

  it.each(['warehouse_admin', 'branch_admin', 'front_staff'] as const)(
    '%s gets 403',
    async (role) => {
      as(role);
      expect((await send('GET', '/api/v1/costed-sales/')).status).toBe(403);
      expect((await send('GET', '/api/v1/costed-sales/1/')).status).toBe(403);
    },
  );
});
