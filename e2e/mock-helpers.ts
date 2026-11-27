import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

export const LOGINS = {
  super_admin: 'SA-0001',
  branch_admin: 'USR-0001',
  front_staff: 'USR-0002',
  warehouse_admin: 'USR-0003',
} as const;

/** Mock mode keeps its session in the page, so sign in through the screen and move around without reloading. */
export async function signIn(page: Page, loginId: string) {
  await page.goto('/');
  await page.getByLabel('Login ID').fill(loginId);
  await page.getByLabel('Password').fill('mock-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  // The signed-in frame (topbar) is there once /me has answered.
  await expect(page.getByRole('banner').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0);
}

/** Client-side navigation (a reload would drop the in-page mock session). */
export async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState({}, '', p);
    dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

/** On phones the sidebar lives in the Menu drawer; on desktop it is always there. Retries, because a redirect right after sign-in closes the drawer. */
export async function openNav(page: Page) {
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  if (!(await menu.isVisible())) return;
  const drawer = page.getByRole('dialog', { name: 'Menu' });
  await expect(async () => {
    if (!(await drawer.isVisible())) await menu.click();
    await expect(drawer).toBeVisible({ timeout: 1000 });
  }).toPass();
}
