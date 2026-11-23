import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { sideways, stubAuth } from './stub';

const fill = async (page: Page, id: string, password: string) => {
  await page.getByLabel('Login ID').fill(id);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
};

test('login screen fits 360 px, fields are labelled, targets are at least 44 px', async ({
  page,
}, info) => {
  await stubAuth(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  for (const target of [
    page.getByLabel('Login ID'),
    page.getByLabel('Password'),
    page.getByRole('button', { name: 'Sign in' }),
  ]) {
    const box = await target.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  }
  await page.screenshot({ path: `test-results/login-${info.project.name}.png` });
});

test('keyboard only: tab through the fields, Enter signs in', async ({ page }) => {
  await stubAuth(page);
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Login ID')).toBeFocused();
  await page.keyboard.type('SA-0001');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Password')).toBeFocused();
  await page.keyboard.type('a-good-password');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
});

test('wrong password: message from the API, focus on the summary, still fits', async ({ page }) => {
  await stubAuth(page);
  await page.goto('/login');
  await fill(page, 'SA-0001', 'wrong');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Login ID or password is not right.');
  await expect(alert).toBeFocused();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('too many attempts: tells the user how long to wait', async ({ page }) => {
  await stubAuth(page);
  await page.goto('/login');
  await fill(page, 'SA-0001', 'locked');
  await expect(page.getByRole('alert')).toContainText('Too many attempts. Wait 15 minutes');
  await expect(page.getByRole('alert')).toBeFocused();
});

test('one-time password: forced change screen, then the app', async ({ page }) => {
  await stubAuth(page);
  await page.goto('/login');
  await fill(page, 'SA-0001', 'one-time');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Choose a new password' }),
  ).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  await page.getByLabel('One-time password').fill('one-time');
  await page.getByLabel('New password', { exact: true }).fill('a-brand-new-pass');
  await page.getByLabel('Confirm new password').fill('a-brand-new-pass');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
});
