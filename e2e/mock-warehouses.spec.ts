import { expect, test } from '@playwright/test';
import { go, goTo, LOGINS, signIn } from './mock-helpers';

test('one warehouse: no Warehouse select; after a second one is added, receipt and dispatch ask for it', async ({
  page,
}) => {
  await signIn(page, LOGINS.super_admin);
  await go(page, '/goods-receipts');
  await expect(page.getByRole('heading', { level: 1, name: 'Receive stock' })).toBeVisible();
  await expect(page.getByLabel('Supplier')).toBeVisible();
  await expect(page.getByLabel('Warehouse', { exact: true })).toHaveCount(0);

  await goTo(page, 'Branches');
  await page.getByRole('button', { name: 'Add a branch' }).click();
  await page.getByLabel('Code').fill('NW');
  await page.getByLabel('Name').fill('North Warehouse');
  await page.getByRole('radiogroup', { name: 'Branch Type' }).getByText('Warehouse').click();
  await page.getByRole('button', { name: 'Save branch' }).click();
  await expect(page.getByRole('cell', { name: 'North Warehouse', exact: true })).toBeVisible();

  await go(page, '/goods-receipts');
  await page.getByLabel('Supplier').fill('Accra Wholesale');
  await page.getByLabel('Find an item to receive').fill('HP');
  await page.getByLabel('Find an item to receive').press('Enter');
  await page.getByRole('button', { name: 'Add HP 250 G9' }).click();
  await page.getByLabel('Quantity: HP 250 G9').fill('6');
  await page.getByLabel('Unit cost (GHS): HP 250 G9').fill('900');
  await page.getByRole('button', { name: 'Review receipt' }).click();
  await expect(page.getByText('Choose a warehouse.')).toBeVisible();
  await page.getByLabel('Warehouse', { exact: true }).selectOption({ label: 'North Warehouse' });
  await page.getByRole('button', { name: 'Review receipt' }).click();
  await expect(page.getByText('North Warehouse', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm receipt' }).click();
  await expect(page.getByText(/is confirmed/)).toBeVisible();

  await go(page, '/dispatches/new');
  await page.getByLabel('Warehouse', { exact: true }).selectOption({ label: 'North Warehouse' });
  await page.getByLabel('Destination branch').selectOption({ label: 'Accra Branch' });
  await page.getByLabel('Find an item in the warehouse').fill('HP');
  await page.getByLabel('Find an item in the warehouse').press('Enter');
  await page.getByRole('button', { name: 'Add HP 250 G9' }).click();
  await page.getByLabel('Quantity: HP 250 G9').fill('2');
  await page.getByRole('button', { name: 'Review dispatch' }).click();
  await page.getByRole('button', { name: 'Confirm dispatch' }).click();
  await expect(page.getByText(/to Accra Branch is on its way/)).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});
