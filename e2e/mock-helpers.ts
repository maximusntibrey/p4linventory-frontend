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

/** Below the Mantis `lg` breakpoint (1266 px) the drawer is temporary and opens from the hamburger. */
export const isPhone = async (page: Page) => (page.viewportSize()?.width ?? 1280) < 1266;

/** Opens the place a user navigates from: the temporary drawer below lg, the permanent drawer above. */
export async function openNav(page: Page) {
  if (await isPhone(page)) {
    const link = page.getByRole('link', { name: 'Payless4Laptops home' });
    if (!(await link.isVisible())) await page.getByRole('button', { name: 'open drawer' }).click();
    await expect(link).toBeVisible();
    return page.getByRole('presentation').filter({ has: link }).first();
  }
  const nav = page.getByRole('navigation', { name: 'Main' });
  // Mini drawer (lg to xl, or collapsed by the user): expand it so the labels show.
  if (!(await nav.getByText('Items', { exact: true }).first().isVisible())) {
    await page.getByRole('button', { name: 'open drawer' }).click();
  }
  return nav;
}

/** Opens a destination by its label from whichever navigation this screen has. */
export async function goTo(page: Page, label: string) {
  const nav = await openNav(page);
  await nav.getByRole('link', { name: label, exact: true }).click();
}

/** Opens the profile menu in the header (on phones through the "more" menu). Returns the header. */
export async function openProfile(page: Page) {
  const header = page.getByRole('banner').first();
  const profile = header.getByRole('button', { name: 'Open profile menu' });
  const more = header.getByRole('button', { name: 'open more menu' });
  await expect(async () => {
    if (!(await profile.isVisible())) await more.click();
    await expect(profile).toBeVisible({ timeout: 1500 });
  }).toPass();
  await profile.click();
  await expect(header.getByRole('button', { name: 'Log out' })).toBeVisible();
  return header;
}

/** The working branch is shown (and switched) in one place: the profile menu. */
export async function expectBranch(page: Page, text: string | RegExp) {
  const header = page.getByRole('banner').first();
  // The menu may close while /me refreshes after a switch: reopen it until the text shows.
  await expect(async () => {
    if (!(await header.getByRole('button', { name: 'Log out' }).isVisible()))
      await openProfile(page);
    await expect(header.getByText(text, { exact: typeof text === 'string' }).first()).toBeVisible({
      timeout: 1500,
    });
  }).toPass();
  // Close it again (on phones the "more" menu may already have closed with it).
  const profile = header.getByRole('button', { name: 'Open profile menu' });
  if (await isPhone(page)) {
    // The menus are click-away popovers: tap an empty spot low on the screen to close them.
    await page.mouse.click(5, (page.viewportSize()?.height ?? 740) - 5);
    await expect(header.getByRole('button', { name: 'Log out' })).toBeHidden();
  } else if (await profile.isVisible()) await profile.click();
}

/** Starts the branch switch from the profile menu. */
export async function startSwitch(page: Page) {
  const header = page.getByRole('banner').first();
  // The menu animates open: retry the whole open-and-click until the picker page shows.
  await expect(async () => {
    const item = header.getByRole('button', { name: 'Switch working branch' });
    if (!(await item.isVisible())) await openProfile(page);
    await page.waitForTimeout(300);
    await item.click({ timeout: 2000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Switch branch' })).toBeVisible({
      timeout: 2000,
    });
  }).toPass();
}

/** Phones collapse two or more page actions into one Actions button; desktop shows them. */
export async function openActions(page: Page) {
  const b = page.getByRole('button', { name: 'Actions', exact: true });
  if (await b.isVisible()) await b.click();
}

/** Phones keep filters, sort and extras behind one Filters button in the Toolbar; desktop shows them. */
export async function openFilters(page: Page) {
  const b = page.getByRole('button', { name: 'Filters', exact: true });
  if (await b.isVisible()) await b.click();
}
