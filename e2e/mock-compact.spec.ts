import { expect, test } from '@playwright/test';
import { LOGINS, openNav, signIn } from './mock-helpers';

// Phone only (mock-phone-360): the palette is the whole navigator.
test('palette reaches every route the sidebar lists, then logs out', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, LOGINS.super_admin);
  const labels = ['Items', 'Warehouse', 'Branches', 'Users', 'Audit Logs'];
  for (const label of labels) {
    const palette = await openNav(page);
    await palette.getByRole('button', { name: new RegExp(`^${label}`) }).click();
    await expect(page.getByRole('dialog', { name: 'Search or jump to' })).toHaveCount(0);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(0);
  }
  // Mobile home: greeting card and quick-link tiles, only what /me lists.
  const palette = await openNav(page);
  await palette.getByRole('button', { name: /^Home/ }).click();
  await expect(page.getByText('Welcome')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Quick links' })).toBeVisible();
  const again = await openNav(page);
  await again.getByText('Profile', { exact: true }).click();
  await again.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
