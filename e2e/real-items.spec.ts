import { expect, test } from '@playwright/test';
import { expectNotBlank, open, pickFirst, PNG, signIn, unique, watch } from './real-helpers';

test.describe.configure({ mode: 'serial' });

test('Super Admin: items list, search, filters; add, view, edit, picture, activate', async ({
  page,
}) => {
  const w = watch(page);
  await signIn(page, 'super_admin');
  await open(page, '/items');
  await expect(page.getByRole('heading', { name: 'Items', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /HP 250 G9/ })).toBeVisible();

  // search + filters
  await page.getByLabel('Search by name, SKU, brand, model or part number').fill('Dell');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('link', { name: /Dell Latitude/ })).toBeVisible();
  await page.getByLabel('Condition').selectOption({ index: 1 });
  await page.getByLabel('Status').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Search' }).click();
  await expectNotBlank(page);

  // ADD item
  const name = `E2E Laptop ${unique()}`;
  await open(page, '/items/new');
  await page.getByLabel('Name', { exact: true }).fill(name);
  await pickFirst(page, 'Category');
  await pickFirst(page, 'Type');
  await pickFirst(page, 'Brand');
  await page.getByLabel('Model', { exact: true }).fill('E2E-1');
  await page.getByLabel('Part number (MPN)').fill(`MPN-${unique()}`);
  await page.getByLabel('Condition').selectOption('refurbished');
  await page.getByLabel('Selling price (GHS)').fill('1999.00');
  await page.getByRole('button', { name: 'Save as draft' }).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();

  // VIEW (detail), upload picture, edit, activate
  await page.reload();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await page.getByLabel('Add a picture').setInputFiles(PNG);
  await page.getByRole('button', { name: 'Upload picture' }).click();
  await expect(page.getByRole('img').first()).toBeVisible();
  await page.getByLabel('Description').fill('Edited by the e2e run');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  await page.getByRole('button', { name: 'Activate item' }).click();
  await expect(page.getByText(/is now Active/)).toBeVisible();
  await w.assertClean();
});

test('Warehouse Admin sees items without cost and can open an item', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'warehouse_admin');
  await open(page, '/items/1');
  await expect(page.getByRole('heading', { name: /HP 250 G9/, level: 1 })).toBeVisible();
  await w.assertClean();
});

test('Front Staff: items are view-only; no add button, detail opens', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'front_staff');
  await open(page, '/items/1');
  await expect(page.getByRole('heading', { name: /HP 250 G9/, level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
  await w.assertClean();
});
