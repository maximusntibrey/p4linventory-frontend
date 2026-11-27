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

/** Phones have no sidebar or menu: navigation is the command palette. */
export const isPhone = (page: Page) =>
  page.getByRole('button', { name: /Search or jump to/ }).isVisible();

/** Opens the place a user navigates from: the palette sheet on phones (grouped like the sidebar), the sidebar on desktop. */
export async function openNav(page: Page) {
  if (!(await isPhone(page))) return page.getByRole('navigation', { name: 'Main' });
  const palette = page.getByRole('dialog', { name: 'Search or jump to' });
  await expect(async () => {
    if (!(await palette.isVisible())) {
      await page.getByRole('button', { name: /Search or jump to/ }).click();
    }
    await expect(palette).toBeVisible({ timeout: 1000 });
  }).toPass();
  return palette;
}

/** Opens a destination by its label from whichever navigation this screen has. */
export async function goTo(page: Page, label: string) {
  const nav = await openNav(page);
  const target = (await isPhone(page))
    ? nav.getByRole('button', { name: new RegExp(`^${label}`) })
    : nav.getByRole('link', { name: label });
  await target.click();
}

/** Phones: opens the palette and unfolds its Profile section. Returns the palette. */
export async function openProfile(page: Page) {
  const palette = await openNav(page);
  const region = palette.getByRole('region', { name: 'Working branch' });
  if (!(await region.isVisible())) await palette.getByText('Profile', { exact: true }).click();
  await expect(region).toBeVisible();
  return palette;
}

/** The working branch name: in the top bar on desktop, in the palette's Profile section on phones. */
export async function expectBranch(page: Page, text: string | RegExp) {
  if (await isPhone(page)) {
    const palette = await openProfile(page);
    await expect(palette.getByRole('region', { name: 'Working branch' })).toContainText(text);
    await page.keyboard.press('Escape');
  } else {
    await expect(
      page.getByRole('banner').getByText(text, { exact: typeof text === 'string' }),
    ).toBeVisible();
  }
}

/** Starts the branch switch: the Switch branch button on desktop, Profile > Switch working branch on phones. */
export async function startSwitch(page: Page) {
  if (await isPhone(page)) {
    const palette = await openProfile(page);
    await palette.getByRole('button', { name: 'Switch working branch' }).click();
  } else {
    await page.getByRole('button', { name: 'Switch branch' }).click();
  }
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
