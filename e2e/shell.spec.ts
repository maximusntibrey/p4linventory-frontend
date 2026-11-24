import { expect, test } from '@playwright/test';
import { sideways, stubAuth } from './stub';

test('shell loads, has labelled nav, and does not scroll sideways', async ({ page }, info) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const label of ['Home', 'Items', 'Warehouse', 'Branches', 'Users']) {
    await expect(nav.getByText(label)).toBeVisible();
  }
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await expect(page.getByRole('banner').getByText('SA-0001')).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `test-results/shell-${info.project.name}.png` });
});

test('unknown route shows the 404 page', async ({ page }) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('keyboard focus is visible', async ({ page }) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Log out' }).waitFor();
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe('none');
});

test('a page the user may not open shows the 403 page', async ({ page }) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/sell');
  await expect(page.getByRole('heading', { level: 1, name: '403: Not allowed' })).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('log out returns to the sign-in screen', async ({ page }) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  await page.goto('/items');
  await expect(page).toHaveURL(/\/login$/);
});
