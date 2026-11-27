import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { components } from '../src/api/schema';
import { sideways, stubAuth, stubData } from './stub';

type S = components['schemas'];

const stockBranch = {
  id: 2,
  kind: 'branch',
  branch_type: 'branch',
  code: 'ACC',
  name: 'Accra Branch',
  is_active: true,
} satisfies S['Branch'];
const stockRows = [
  {
    location_id: 2,
    location_name: 'Accra Branch',
    item_id: 1,
    sku: 'SKU-000001',
    item_name: 'HP 250 G9',
    on_hand: 4,
    reserved: 1,
    available: 3,
    quarantined: 0,
    reorder_level: null,
    low_stock: false,
  },
] satisfies S['StockBalance'][];

async function setup(page: Page, permissions: S['Me']['permissions'] = ['find.use', 'stock.view']) {
  await stubAuth(page, { signedIn: true, frontStaff: true });
  await stubData(page);
  // Registered after stubAuth, so this /me wins: Front Staff with find.use and a working branch.
  await page.route('**/api/v1/auth/me/', (route) =>
    route.fulfill({
      json: {
        user: {
          id: 3,
          login_id: 'USR-0002',
          full_name: 'Esi Owusu',
          status: 'active',
          roles: ['front_staff'],
          permanent_location_id: null,
          must_change_password: false,
          permissions: [],
        },
        active_role: 'front_staff',
        working_branch: stockBranch,
        must_pick_branch: false,
        all_branches: false,
        can_assign_multiple_roles: false,
        must_change_password: false,
        permissions,
        menu: [{ key: 'find', label: 'Find', path: '/find' }],
        home_links: [],
      } satisfies S['Me'],
    }),
  );
  await page.route('**/api/v1/stock/**', (r) =>
    r.fulfill({
      json: { count: 1, page: 1, page_size: 25, next: null, previous: null, results: stockRows },
    }),
  );
  await page.route('**/api/v1/items/1/branch-availability/', (r) =>
    r.fulfill({
      json: [
        { branch_id: 3, branch_name: 'Kumasi Branch', quantity: 5 },
        { branch_id: 4, branch_name: 'Takoradi Branch With A Rather Long Name', quantity: 0 },
      ] satisfies S['BranchAvailability'][],
    }),
  );
}

test('find: my stock, other branches by name and quantity, no sideways scroll, 44 px targets', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/find');
  await expect(page.getByRole('heading', { level: 1, name: 'Find' })).toBeVisible();
  await expect(page.getByText('3 available')).toBeVisible();
  const btn = page.getByRole('button', { name: /other branches for HP 250 G9/ });
  expect((await btn.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await btn.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Kumasi Branch')).toBeVisible();
  await expect(page.getByText('5 available')).toBeVisible();
  await expect(page.getByText('Takoradi Branch With A Rather Long Name')).toBeVisible();
  await expect(page.getByText(/GHS|cost/i)).toHaveCount(0);
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

const hpSale = {
  id: 7,
  reference: 'SAL-000007',
  location: stockBranch,
  staff: 'USR-0002',
  status: 'completed',
  payment_method: 'cash',
  total: '2500.00',
  sold_at: '2026-11-24T10:00:00Z',
  lines: [
    {
      id: 1,
      item_id: 1,
      sku: 'SKU-000001',
      item_name: 'HP 250 G9',
      quantity: 2,
      unit_price: '1250.00',
      line_total: '2500.00',
    },
  ],
  cancellation: null,
} satisfies S['Sale'];

test('sell: three steps, a running total, the server total at the end; 360 px and 44 px', async ({
  page,
}) => {
  await setup(page, ['sales.record', 'stock.view']);
  const posted: unknown[] = [];
  await page.route('**/api/v1/items/1/', (r) =>
    r.fulfill({
      json: {
        id: 1,
        sku: 'SKU-000001',
        name: 'HP 250 G9',
        selling_price: '1250.00',
        status: 'active',
      },
    }),
  );
  await page.route('**/api/v1/sales/', (r) => {
    posted.push(r.request().postDataJSON());
    return r.fulfill({ status: 201, json: hpSale });
  });
  await page.goto('/sell');
  await expect(page.getByRole('heading', { level: 1, name: 'Sell' })).toBeVisible();
  await page.getByLabel('Find an item to sell').fill('HP');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Add HP 250 G9' }).click();
  await page.getByLabel('Quantity: HP 250 G9').fill('2');
  await expect(page.getByText('GHS 2500.00')).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  const next = page.getByRole('button', { name: 'Next: payment' });
  expect((await next.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await next.click();
  await page.getByLabel('Payment method').selectOption('cash');
  await page.getByRole('button', { name: 'Next: confirm' }).click();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Confirm sale' }).click();
  await expect(page.getByText('Sale SAL-000007 is recorded.')).toBeVisible();
  await expect(page.getByText(/GHS|cost/i).first()).toBeVisible();
  await expect(page.getByText(/average|cost price/i)).toHaveCount(0);
  expect(posted).toEqual([{ payment_method: 'cash', lines: [{ item_id: 1, quantity: 2 }] }]);
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('sales list: cancel needs a reason and a confirm, then shows the Cancelled badge', async ({
  page,
}) => {
  await setup(page, ['sales.record', 'sales.cancel', 'stock.view']);
  let sale: S['Sale'] = hpSale;
  await page.route(/\/api\/v1\/sales\/(\?.*)?$/, (r) =>
    r.fulfill({
      json: { count: 1, page: 1, page_size: 25, next: null, previous: null, results: [sale] },
    }),
  );
  await page.route('**/api/v1/sales/7/cancel/', (r) => {
    sale = {
      ...hpSale,
      status: 'cancelled',
      cancellation: {
        reason: (r.request().postDataJSON() as { reason: string }).reason,
        cancelled_by: 'USR-0002',
        cancelled_role: 'branch_admin',
        cancelled_at: '2026-11-24T11:00:00Z',
      },
    };
    return r.fulfill({ json: sale });
  });
  await page.goto('/sell/sales');
  await expect(page.getByRole('cell', { name: 'SAL-000007', exact: true })).toBeVisible();
  await expect(page.locator('span', { hasText: /^Completed$/ }).last()).toBeVisible();
  const open = page.getByRole('button', { name: 'Cancel sale SAL-000007' });
  expect((await open.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await open.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Cancel this sale' }).click();
  await expect(page.getByText('Give a reason for cancelling.')).toBeVisible();
  await page.getByLabel('Reason').fill('Wrong laptop');
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Cancel this sale' }).click();
  await expect(page.locator('span', { hasText: /^Cancelled$/ }).last()).toBeVisible();
  await expect(page.getByText(/Reason: Wrong laptop/)).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('CSV import: dry run with row-numbered errors, a clean re-check, then the confirm step', async ({
  page,
}) => {
  await stubAuth(page, { signedIn: true });
  await stubData(page);
  const clean = {
    dry_run: true,
    committed: false,
    batch_reference: null,
    location_id: 1,
    rows: 2,
    items_created: 1,
    items_existing: 1,
    opening_quantity_total: 8,
    errors: [],
  } satisfies S['ItemImportReport'];
  let calls = 0;
  await page.route('**/api/v1/item-imports/', (r) => {
    calls += 1;
    const body = r.request().postData() ?? '';
    const dry = /name="dry_run"\s+true/.test(body);
    if (calls === 1)
      return r.fulfill({
        json: {
          ...clean,
          errors: [{ row: 3, field: 'unit_cost', message: 'Enter a cost such as 900.00.' }],
        },
      });
    return r.fulfill({
      json: dry
        ? clean
        : { ...clean, dry_run: false, committed: true, batch_reference: 'IMP-000001' },
    });
  });
  await page.goto('/items/import');
  await expect(page.getByRole('heading', { level: 1, name: 'Import from CSV' })).toBeVisible();
  await expect(page.getByText(/adds the quantities again/)).toBeVisible();
  await page.getByLabel('Location').selectOption({ label: 'Central Warehouse' });
  const csv = { name: 'stock.csv', mimeType: 'text/csv', buffer: Buffer.from('sku,x') };
  await page.getByLabel(/CSV file/).setInputFiles(csv);
  await page.getByRole('button', { name: 'Check the file' }).click();
  await expect(page.getByText('Row 3').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import now' })).toHaveCount(0);
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Check the file' }).click();
  await expect(page.getByText('No errors. Nothing has been saved yet.')).toBeVisible();
  const go = page.getByRole('button', { name: 'Import now' });
  expect((await go.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  await go.click();
  await expect(page.getByText('Import IMP-000001 is done.')).toBeVisible();
});
