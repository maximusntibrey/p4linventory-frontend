import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import {
  expectNotBlank,
  logOut,
  open,
  pickBranchIfAsked,
  signIn,
  unique,
  watch,
} from './real-helpers';

test.describe.configure({ mode: 'serial' });

/** Item picker used by receipt, dispatch and sale: search by name, add the first match. */
async function addItem(page: Page, pickerLabel: string) {
  await page.getByLabel(pickerLabel).fill('HP 250');
  await page.getByRole('button', { name: 'Search' }).click();
  await page
    .getByRole('button', { name: /^Add HP 250 G9 Laptop/ })
    .first()
    .click();
}

/** With more than one warehouse the page asks which one: pick the seeded one. */
async function pickWarehouse(page: Page) {
  await page.waitForLoadState('networkidle');
  const select = page.getByLabel('Warehouse', { exact: true });
  if (await select.isVisible()) await select.selectOption({ label: 'Central Warehouse' });
}

async function dispatchFromWarehouse(page: Page, qty: string): Promise<string> {
  await open(page, '/dispatches/new');
  await pickWarehouse(page);
  await page.getByLabel('Destination branch').selectOption({ label: 'Accra Central' });
  await addItem(page, 'Find an item in the warehouse');
  await page.getByLabel(/^Quantity: HP 250/).fill(qty);
  await page.getByRole('button', { name: 'Review dispatch' }).click();
  await page.getByRole('button', { name: 'Confirm dispatch' }).click();
  const done = page.getByText(/TRF-\d+/).first();
  await expect(done).toBeVisible();
  return /TRF-\d+/.exec(await done.innerText())![0];
}

test('Warehouse Admin: stock view, goods receipt, three dispatches', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'warehouse_admin');
  await open(page, '/stock');
  await expect(page.getByRole('heading', { name: 'Stock', level: 1 })).toBeVisible();
  await expectNotBlank(page);

  await open(page, '/goods-receipts');
  await pickWarehouse(page);
  await page.getByLabel('Supplier').fill(`E2E Supplier ${unique()}`);
  await addItem(page, 'Find an item to receive');
  await page.getByLabel(/^Quantity: HP 250/).fill('12');
  await page.getByLabel(/^Unit cost/).fill('2000.00');
  await page.getByRole('button', { name: 'Review receipt' }).click();
  await page.getByRole('button', { name: 'Confirm receipt' }).click();
  await expect(page.getByText(/is confirmed/)).toBeVisible();

  const refs: string[] = [];
  for (const q of ['4', '2', '1']) refs.push(await dispatchFromWarehouse(page, q));
  await open(page, '/dispatches');
  await expect(page.getByText(refs[0]).first()).toBeVisible();
  await w.assertClean();
});

test('Branch Admin: receives one delivery short, one in full, rejects one', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'branch_admin');
  await pickBranchIfAsked(page, 'Accra Central');
  await open(page, '/receive');
  await expect(page.getByRole('link', { name: /Check delivery/ }).first()).toBeVisible();

  // short: one unit less arrives
  await page
    .getByRole('link', { name: /Check delivery/ })
    .first()
    .click();
  await expect(page.getByRole('heading', { name: 'Check delivery' })).toBeVisible();
  await page.getByRole('button', { name: 'Received all' }).click();
  const field = page.getByLabel(/^Received:/).first();
  const sent = Number(await field.inputValue());
  await field.fill(String(Math.max(sent - 1, 0)));
  await page.getByLabel('Note about the shortfall').fill('One unit missing from the box (e2e)');
  await page.getByRole('button', { name: 'Review delivery' }).click();
  await page.getByRole('button', { name: 'Confirm receipt' }).click();
  await expect(page.getByRole('button', { name: /Confirm (receipt|rejection)/ })).toHaveCount(0);

  // full
  await open(page, '/receive');
  await page
    .getByRole('link', { name: /Check delivery/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Received all' }).click();
  await page.getByRole('button', { name: 'Review delivery' }).click();
  await page.getByRole('button', { name: 'Confirm receipt' }).click();
  await expect(page.getByRole('button', { name: /Confirm (receipt|rejection)/ })).toHaveCount(0);

  // reject
  await open(page, '/receive');
  await page
    .getByRole('link', { name: /Check delivery/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Reject delivery' }).click();
  await page.getByLabel('Reason for rejecting').fill('Wrong goods (e2e)');
  await page.getByRole('button', { name: 'Confirm rejection' }).click();
  await expect(page.getByRole('button', { name: /Confirm (receipt|rejection)/ })).toHaveCount(0);
  await w.assertClean();
});

test('Super Admin: resolves a shortfall', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'super_admin');
  await open(page, '/shortfalls');
  const resolve = page.getByRole('button', { name: /^Resolve shortfall/ }).first();
  await expect(resolve).toBeVisible();
  await resolve.click();
  await page.getByLabel('Resolution').selectOption({ index: 1 });
  await page.getByLabel('Note').fill('Resolved by the e2e run');
  await page.getByRole('button', { name: 'Confirm resolution' }).click();
  await expect(page.getByRole('button', { name: 'Confirm resolution' })).toHaveCount(0);
  await w.assertClean();
});

test('Front Staff finds an item and sells it; Super Admin cancels the sale', async ({
  page,
  browser,
}) => {
  const w = watch(page);
  await signIn(page, 'front_staff');
  await pickBranchIfAsked(page, 'Accra Central');

  await open(page, '/find');
  await page.getByLabel('Item name or SKU').fill('HP 250');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText(/HP 250 G9 Laptop/).first()).toBeVisible();
  await page
    .getByRole('button', { name: /other branches for/i })
    .first()
    .click();

  await open(page, '/sell');
  await pickBranchIfAsked(page, 'Accra Central');
  await addItem(page, 'Find an item to sell');
  await page.getByLabel(/^Quantity: HP 250/).fill('1');
  await page.getByRole('button', { name: 'Next: payment' }).click();
  await page.getByLabel('Payment method').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Next: confirm' }).click();
  await page.getByRole('button', { name: 'Confirm sale' }).click();
  await expect(page.getByRole('button', { name: 'Sell again' })).toBeVisible();
  await w.assertClean();
  await logOut(page);

  const p2 = await (await browser.newContext()).newPage();
  const w2 = watch(p2);
  await signIn(p2, 'super_admin');
  await open(p2, '/sell/sales');
  await pickBranchIfAsked(p2, 'Accra Central');
  await p2
    .getByRole('button', { name: /^Cancel sale/ })
    .first()
    .click();
  await p2.getByLabel('Reason').fill('Cancelled by the e2e run');
  await p2.getByRole('button', { name: 'Cancel this sale' }).click();
  await expect(p2.getByRole('button', { name: 'Cancel this sale' })).toHaveCount(0);
  await w2.assertClean();
});
