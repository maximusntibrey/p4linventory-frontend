import { expect, test } from '@playwright/test';
import { isPhone, openNav } from './mock-helpers';
import { sideways, stubAuth } from './stub';

test('shell loads, has labelled navigation, and does not scroll sideways', async ({
  page,
}, info) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  const nav = await openNav(page);
  for (const label of ['Home', 'Items', 'Warehouse', 'Branches', 'Users']) {
    await expect(nav.getByText(label, { exact: true }).first()).toBeVisible();
  }
  if (await isPhone(page)) {
    // The palette carries the account actions too.
    await expect(nav.getByText('Profile', { exact: true })).toBeVisible();
  } else {
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'No notifications yet' })).toBeVisible();
    await expect(page.getByRole('button', { name: /SA-0001/ })).toBeVisible();
  }
  await page.keyboard.press('Escape');
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `test-results/shell-${info.project.name}.png` });
});

test('phone: the bar is only the Search or jump to field; the profile is inside the palette', async ({
  page,
}) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  test.skip(!(await isPhone(page)), 'phone layout only');
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Switch branch' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^No notifications/ })).toHaveCount(0);
  const bar = page.getByRole('banner').first();
  // Exactly one interactive element, and no user text in the bar.
  await expect(bar.getByRole('button')).toHaveCount(1);
  await expect(bar.getByRole('button')).toHaveText(/Search or jump to/);
  await expect(bar.locator('a, input, select, [tabindex]')).toHaveCount(0);
  await expect(bar).not.toContainText('Ama Mensah');
  await expect(bar).not.toContainText('Super Admin');
  const box = await bar.boundingBox();
  expect(box!.height).toBeLessThanOrEqual(64);
  expect((await bar.getByRole('button').boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
  // No profile button anywhere outside the palette.
  await expect(page.getByRole('button', { name: /Open profile|Profile/ })).toHaveCount(0);
  const palette = await openNav(page);
  await palette.getByText('Profile', { exact: true }).click();
  await expect(palette.getByText('SA-0001')).toBeVisible();
  await expect(palette.getByText('Ama Mensah').first()).toBeVisible();
  await expect(palette.getByRole('region', { name: 'Working branch' })).toBeVisible();
  await expect(palette.getByRole('button', { name: 'Change password' })).toBeVisible();
  await expect(palette.getByText('No notifications yet')).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('desktop: the top bar has no search field or palette trigger; the sidebar stays', async ({
  page,
}) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  test.skip(await isPhone(page), 'desktop layout only');
  await expect(page.getByRole('button', { name: /Search or jump to/ })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Search or jump to' })).toBeVisible();
});

test('desktop: the user pill opens the profile panel', async ({ page }) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  test.skip(await isPhone(page), 'desktop layout only');
  await page.getByRole('button', { name: /Ama Mensah/ }).click();
  const profile = page.getByRole('dialog', { name: 'Profile' });
  for (const name of ['Profile', 'Working branch', 'Security', 'Notifications']) {
    await expect(profile.getByRole('region', { name })).toBeVisible();
  }
  await expect(profile.getByText('SA-0001')).toBeVisible();
  await expect(profile.getByRole('button', { name: 'Log out' })).toBeVisible();
  await expect(profile.getByText('No notifications yet')).toBeVisible();
});

test('unknown route shows the 404 page', async ({ page }) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('keyboard focus is visible', async ({ page }) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
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
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  const nav = await openNav(page);
  if (await isPhone(page)) await nav.getByText('Profile', { exact: true }).click();
  await ((await isPhone(page)) ? nav : page).getByRole('button', { name: /^Log out/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  await page.goto('/items');
  await expect(page).toHaveURL(/\/login$/);
});
