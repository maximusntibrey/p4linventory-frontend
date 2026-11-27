import { expect, test } from '@playwright/test';
import { goTo, LOGINS, openProfile, signIn } from './mock-helpers';

// Phone only (mock-phone-360): the temporary drawer is the whole navigator.
test('drawer reaches every route the menu lists, then logs out', async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, LOGINS.super_admin);
  const labels = ['Items', 'Warehouse', 'Branches', 'Users', 'Audit Logs'];
  for (const label of labels) {
    await goTo(page, label);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    ).toBeLessThanOrEqual(0);
  }
  await goTo(page, 'Home');
  await expect(page.getByText('Quick actions')).toBeVisible();
  const header = await openProfile(page);
  await header.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
