import { expect, test } from '@playwright/test';
import { goTo, LOGINS, openNav, signIn } from './mock-helpers';

test('Audit Logs has its own tab and is not on the dashboard (Super Admin)', async ({ page }) => {
  await signIn(page, LOGINS.super_admin);
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent activity' })).toHaveCount(0);
  await expect(page.getByRole('table')).toHaveCount(0);
  await goTo(page, 'Audit Logs');
  await expect(page.getByRole('heading', { level: 1, name: 'Audit Logs' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Audit log' })).toBeVisible();
  await expect(page.getByText('User created')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('Front Staff has no Audit Logs item', async ({ page }) => {
  await signIn(page, LOGINS.front_staff);
  const nav = await openNav(page);
  await expect(nav).toBeVisible();
  await expect(nav.getByText('Audit Logs')).toHaveCount(0);
});

test('a Normal Branch can be created; a second Warehouse is refused on the Branch Type field', async ({
  page,
}) => {
  await signIn(page, LOGINS.super_admin);
  await goTo(page, 'Branches');
  await expect(page.getByRole('heading', { level: 1, name: 'Branches' })).toBeVisible();

  await page.getByRole('button', { name: 'Add a branch' }).click();
  await page.getByLabel('Code').fill('TMA');
  await page.getByLabel('Name').fill('Tema Branch');
  await page.getByRole('radiogroup', { name: 'Branch Type' }).getByText('Normal Branch').click();
  await page.getByRole('button', { name: 'Save branch' }).click();
  await expect(page.getByRole('status')).toContainText('Branch saved.');
  await expect(page.getByRole('cell', { name: 'Tema Branch', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Add a branch' }).click();
  await page.getByLabel('Code').fill('W2');
  await page.getByLabel('Name').fill('Second warehouse');
  await page.getByRole('radiogroup', { name: 'Branch Type' }).getByText('Warehouse').click();
  await page.getByRole('button', { name: 'Save branch' }).click();
  await expect(page.getByText('A warehouse already exists.').first()).toBeVisible();
  await expect(page.getByRole('radiogroup', { name: 'Branch Type' })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
});
