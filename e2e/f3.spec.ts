import { expect, test } from '@playwright/test';
import { expectBranch, openProfile, startSwitch } from './mock-helpers';
import { sideways, stubAuth, stubData } from './stub';

test('branch switching: first pick, then switch with the keyboard; no sideways scroll', async ({
  page,
}) => {
  await stubAuth(page, { signedIn: true, frontStaff: true });
  await stubData(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Choose your branch' })).toBeVisible();
  await expectBranch(page, 'No branch selected');
  expect(await sideways(page)).toBeLessThanOrEqual(0);

  await page.getByRole('button', { name: 'Accra Branch' }).click();
  await expectBranch(page, 'Accra Branch');
  await expect(page.getByRole('heading', { name: 'Choose your branch' })).toHaveCount(0);

  // The one switcher lives in the profile menu.
  await startSwitch(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Switch branch' })).toBeVisible();
  const kumasi = page.getByRole('button', { name: 'Kumasi Branch' });
  await kumasi.focus();
  await expect(kumasi).toBeFocused();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  const box = await kumasi.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press('Enter');
  await expectBranch(page, 'Kumasi Branch');
  await expect(page.getByRole('heading', { level: 1, name: 'Switch branch' })).toHaveCount(0);
});

test('the Super Admin top bar has no Switch branch when /me does not allow it', async ({
  page,
}) => {
  await stubAuth(page, { signedIn: true });
  await stubData(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Switch (working )?branch/ })).toHaveCount(0);
  const menu = await openProfile(page);
  await expect(menu.getByText('All branches', { exact: true }).first()).toBeVisible();
  await expect(menu.getByLabel('Filter by branch')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Filter by branch')).toBeVisible();
  await expect(page.getByText('Low stock items')).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('create a user: the one-time password is shown once, with copy, and is gone afterwards', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await stubAuth(page, { signedIn: true });
  await stubData(page);
  await page.goto('/users');
  await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);

  await page.getByRole('link', { name: 'Add a user' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Add a user' })).toBeVisible();
  await page.getByLabel('Full name').fill('Nana Addo');
  await page.getByLabel('Front Staff').check();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Create user' }).click();

  await expect(page.getByText('E2E-One-Time-9137')).toBeVisible();
  await expect(page.getByText(/Their login ID is USR-0010/)).toBeVisible();
  await expect(page.getByText(/shown only once/)).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);

  const copy = page.getByRole('button', { name: 'Copy password' });
  expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await copy.click();
  await expect(page.getByText('Password copied.')).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('E2E-One-Time-9137');

  await page.getByRole('button', { name: 'I have saved it' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Users' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nana Addo' })).toBeVisible();
  await expect(page.getByText('E2E-One-Time-9137')).toHaveCount(0);
  expect(
    await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage })),
  ).not.toContain('E2E-One-Time');
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('branches list fits 360 px and every action has a text label', async ({ page }) => {
  await stubAuth(page, { signedIn: true });
  await stubData(page);
  await page.goto('/branches');
  await expect(page.getByRole('heading', { level: 1, name: 'Branches' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add a branch' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Edit Accra Branch' })).toHaveText('Edit');
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});
