import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import type { components } from '../src/api/schema';
import { branches, sideways, stubAuth, stubData } from './stub';

type S = components['schemas'];
const t = '2026-11-23T14:05:00Z';
const [warehouse, accra, kumasi] = branches;
const page1 = <T>(results: T[]) => ({
  count: results.length,
  page: 1,
  page_size: 25,
  next: null,
  previous: null,
  results,
});
const line = (id: number, item_id: number, item_name: string, qty_sent: number) =>
  ({
    id,
    item_id,
    sku: `SKU-00000${item_id}`,
    item_name,
    qty_sent,
    qty_received: null,
    qty_accepted: null,
    qty_rejected: null,
    shortfall: 0,
    line_note: null,
  }) satisfies S['DispatchLine'];
const transfer = (
  id: number,
  destination: S['Branch'],
  lines: S['DispatchLine'][],
): S['Dispatch'] => ({
  id,
  reference: `TRF-${String(id).padStart(6, '0')}`,
  origin: warehouse,
  destination,
  status: 'in_transit',
  lines,
  dispatched_at: t,
  dispatched_by: 'USR-0001',
  received_at: null,
  received_by: null,
  receive_note: null,
  has_open_discrepancy: false,
});

const hp = {
  id: 1,
  sku: 'SKU-000001',
  name: 'HP 250 G9',
  category_id: 1,
  subtype_id: 1,
  brand_id: 1,
  brand_name: 'HP',
  model_name: '250 G9',
  mpn: '6S6D3EA',
  condition: 'refurbished',
  grade: 'A',
  unit_of_measure: 'piece',
  status: 'active',
  key_specs: {},
  image_url: null,
  show_on_website: true,
  selling_price: '1250.00',
  created_at: t,
  updated_at: t,
} satisfies S['Item'];

/** Items, warehouse stock, receipts and dispatches for the F5 screens, with counters of what was posted. */
async function setup(page: Page) {
  const posted = {
    receipts: [] as unknown[],
    dispatches: [] as unknown[],
    decisions: [] as unknown[],
  };
  const dispatches: S['Dispatch'][] = [
    transfer(1, accra, [line(1, 1, 'HP 250 G9', 2), line(2, 2, 'Dell 65W charger', 5)]),
    transfer(2, kumasi, [line(3, 1, 'HP 250 G9', 3)]),
  ];
  await stubAuth(page, { signedIn: true });
  await stubData(page);
  await page.route('**/api/v1/items/**', (r) => r.fulfill({ json: page1([hp]) }));
  await page.route('**/api/v1/stock/**', (r) =>
    r.fulfill({
      json: page1([
        {
          location_id: warehouse.id,
          location_name: warehouse.name,
          item_id: 1,
          sku: 'SKU-000001',
          item_name: 'HP 250 G9',
          on_hand: 12,
          reserved: 2,
          available: 10,
          quarantined: 0,
          reorder_level: null,
          low_stock: false,
        },
      ] satisfies S['StockBalance'][]),
    }),
  );
  await page.route('**/api/v1/goods-receipts/**', async (r) => {
    const body = r.request().postDataJSON() as S['GoodsReceiptCreate'];
    posted.receipts.push(body);
    return r.fulfill({
      status: 201,
      json: {
        id: 2,
        reference: 'GRN-000002',
        location_id: warehouse.id,
        supplier_name: body.supplier_name,
        notes: '',
        lines: body.lines.map((l, i) => ({
          id: i + 1,
          item_id: l.item_id,
          sku: 'SKU-000001',
          item_name: 'HP 250 G9',
          quantity: l.quantity,
          unit_cost: l.unit_cost,
        })),
        received_at: t,
        received_by: 'SA-0001',
      } satisfies S['GoodsReceipt'],
    });
  });
  await page.route('**/api/v1/dispatches/**', async (r) => {
    const req = r.request();
    const url = new URL(req.url());
    const path = url.pathname.replace('/api/v1/dispatches/', '');
    if (req.method() === 'POST' && path === '') {
      const body = req.postDataJSON() as S['DispatchCreate'];
      posted.dispatches.push(body);
      const made = transfer(
        dispatches.length + 1,
        branches.find((b) => b.id === body.destination_id)!,
        body.lines.map((l, i) => line(90 + i, l.item_id, 'HP 250 G9', l.quantity)),
      );
      dispatches.push(made);
      return r.fulfill({ status: 201, json: made });
    }
    if (req.method() === 'POST') {
      const body = req.postDataJSON() as S['DispatchReceive'];
      posted.decisions.push(body);
      const row = dispatches.find((d) => d.id === Number(path.split('/')[0]))!;
      row.status = body.decision === 'approve_all' ? 'completed' : 'partially_received';
      row.received_at = t;
      row.received_by = 'SA-0001';
      row.receive_note = body.note ?? null;
      for (const g of body.lines ?? []) {
        const l = row.lines.find((x) => x.id === g.line_id)!;
        l.qty_received = g.qty_received;
        l.qty_accepted = g.qty_accepted;
        l.qty_rejected = g.qty_received - g.qty_accepted;
        l.shortfall = l.qty_sent - g.qty_accepted;
      }
      row.has_open_discrepancy = row.lines.some((l) => l.shortfall > 0);
      return r.fulfill({ json: row });
    }
    if (path === 'waiting/') {
      const branch = Number(url.searchParams.get('branch_id'));
      return r.fulfill({
        json: page1(
          dispatches.filter((d) => d.status === 'in_transit' && d.destination.id === branch),
        ),
      });
    }
    if (path === '') return r.fulfill({ json: page1(dispatches) });
    return r.fulfill({ json: dispatches.find((d) => d.id === Number(path.split('/')[0])) });
  });
  return posted;
}

const tall = async (loc: Locator) =>
  expect((await loc.boundingBox())!.height).toBeGreaterThanOrEqual(44);
const flat = async (page: Page) => expect(await sideways(page)).toBeLessThanOrEqual(0);

test('receive stock with the keyboard: supplier, item line, review, confirm, reference', async ({
  page,
}) => {
  const posted = await setup(page);
  await page.goto('/goods-receipts');
  await expect(page.getByRole('heading', { level: 1, name: 'Receive stock' })).toBeVisible();
  await flat(page);
  await page.getByLabel('Supplier').focus();
  await page.keyboard.type('Accra Wholesale');
  await page.getByLabel('Find an item to receive').focus();
  await page.keyboard.type('HP');
  await page.keyboard.press('Enter');
  const add = page.getByRole('button', { name: 'Add HP 250 G9' });
  await expect(add).toBeVisible();
  await tall(add);
  await add.focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Quantity: HP 250 G9').fill('5');
  await page.getByLabel('Unit cost (GHS): HP 250 G9').fill('910.5');
  for (const label of ['Supplier', 'Quantity: HP 250 G9', 'Unit cost (GHS): HP 250 G9']) {
    await tall(page.getByLabel(label, { exact: true }));
  }
  await flat(page);
  const review = page.getByRole('button', { name: 'Review receipt' });
  await tall(review);
  await review.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/5 × HP 250 G9 \(SKU-000001\) at GHS 910\.50 each/)).toBeVisible();
  await flat(page);
  const confirm = page.getByRole('button', { name: 'Confirm receipt' });
  await tall(confirm);
  await confirm.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText(/Receipt GRN-000002 is confirmed/)).toBeVisible();
  expect(posted.receipts).toEqual([
    {
      supplier_name: 'Accra Wholesale',
      lines: [{ item_id: 1, quantity: 5, unit_cost: '910.50' }],
    },
  ]);
  await flat(page);
});

test('dispatch: status list, a new dispatch to a branch, one request on a double click', async ({
  page,
}) => {
  const posted = await setup(page);
  await page.goto('/dispatches');
  await expect(page.getByRole('heading', { level: 1, name: 'Dispatch' })).toBeVisible();
  await expect(page.getByText('TRF-000001')).toBeVisible();
  await expect(page.getByRole('listitem').getByText('In transit').first()).toBeVisible();
  await tall(page.getByRole('link', { name: 'New dispatch' }));
  await tall(page.getByLabel('Status'));
  await flat(page);

  await page.getByRole('link', { name: 'New dispatch' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Dispatch to a branch' })).toBeVisible();
  await page.getByLabel('Destination branch').selectOption({ label: 'Accra Branch' });
  await page.getByLabel('Find an item in the warehouse').fill('HP');
  await page.getByLabel('Find an item in the warehouse').press('Enter');
  await expect(page.getByText(/Available: 10/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Add HP 250 G9' }).click();
  await page.getByLabel('Quantity: HP 250 G9').fill('4');
  await flat(page);
  await page.getByRole('button', { name: 'Review dispatch' }).click();
  await flat(page);
  await page.getByRole('button', { name: 'Confirm dispatch' }).dblclick();
  await expect(page.getByText(/Dispatch TRF-000003 to Accra Branch is on its way/)).toBeVisible();
  expect(posted.dispatches).toHaveLength(1);
  await flat(page);
});

test('branch receiving: pick a branch, quantities start as sent, a shortfall is highlighted and needs a note', async ({
  page,
}) => {
  const posted = await setup(page);
  await page.goto('/receive');
  await expect(page.getByRole('heading', { level: 1, name: 'Receive' })).toBeVisible();
  await page.getByLabel('Branch', { exact: true }).selectOption({ label: 'Accra Branch' });
  await expect(page.getByText('Waiting at Accra Branch')).toBeVisible();
  await expect(page.getByText('TRF-000002')).toHaveCount(0);
  const open = page.getByRole('link', { name: 'Check delivery TRF-000001' });
  await tall(open);
  await flat(page);
  await open.click();

  await expect(page.getByLabel('Received: HP 250 G9')).toHaveValue('2');
  await expect(page.getByLabel('Received: Dell 65W charger')).toHaveValue('5');
  await tall(page.getByLabel('Received: HP 250 G9'));
  await tall(page.getByRole('button', { name: 'Received all' }));
  await page.getByLabel('Received: Dell 65W charger').fill('3');
  await expect(page.getByText('Short by 2')).toBeVisible();
  await flat(page);
  await page.getByRole('button', { name: 'Review delivery' }).click();
  await expect(page.getByText('Add a note about the shortfall.')).toBeVisible();
  await page.getByLabel('Note about the shortfall').fill('Two chargers missing');
  await page.getByRole('button', { name: 'Review delivery' }).click();
  await expect(page.getByText(/Receive 5 of 7 units \(short by 2\)/)).toBeVisible();
  await flat(page);
  await page.getByRole('button', { name: 'Confirm receipt' }).click();
  await expect(page.getByText('Partially received')).toBeVisible();
  await expect(page.getByText('Short by 2')).toBeVisible();
  expect(posted.decisions).toEqual([
    {
      decision: 'approve_partial',
      note: 'Two chargers missing',
      lines: [
        { line_id: 1, qty_received: 2, qty_accepted: 2 },
        { line_id: 2, qty_received: 3, qty_accepted: 3 },
      ],
    },
  ]);
  await flat(page);
});
