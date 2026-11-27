import { expect, test } from '@playwright/test';
import { isPhone, openNav, openProfile } from './mock-helpers';
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
  if (await isPhone(page)) await page.keyboard.press('Escape');
  const header = await openProfile(page);
  await expect(header.getByText('SA-0001')).toBeVisible();
  await expect(page.getByRole('button', { name: /Notifications/ })).toBeVisible();
  await page.keyboard.press('Escape');
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `test-results/shell-${info.project.name}.png` });
});

test('phone: temporary drawer opens from the hamburger and closes after a choice', async ({
  page,
}) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  test.skip(!(await isPhone(page)), 'phone layout only');
  await expect(page.getByRole('link', { name: 'Items', exact: true })).toBeHidden();
  const nav = await openNav(page);
  await nav.getByRole('link', { name: 'Items', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Items', exact: true })).toBeHidden();
  await expect(page).toHaveURL(/\/items$/);
});

test('desktop: the permanent drawer stays and the header has the search field', async ({
  page,
}) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  test.skip(await isPhone(page), 'desktop layout only');
  await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Search or jump to' })).toBeVisible();
});

test('unknown route shows the 404 page', async ({ page }) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/no-such-page');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('keyboard focus is visible', async ({ page }) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const cs = getComputedStyle(el);
    return `${cs.outlineStyle}|${cs.boxShadow}`;
  });
  expect(outline).not.toBe('none|none');
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
  const header = await openProfile(page);
  await header.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
});
