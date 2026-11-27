import { expect, test } from '@playwright/test';
import {
  expectNotBlank,
  logOut,
  open,
  openProfileItem,
  password,
  pickBranchIfAsked,
  ROLES,
  signIn,
  unique,
  watch,
  type Role,
} from './real-helpers';

async function expectBranch(page: import('@playwright/test').Page, name: string) {
  await page.getByRole('banner').first().getByRole('button', { name: 'Open profile menu' }).click();
  await expect(page.getByText(name).first()).toBeVisible();
  await page.keyboard.press('Escape');
}

test('wrong password shows the API message, not a network banner', async ({ page }) => {
  const w = watch(page);
  w.expected.push('POST 400 /api/v1/auth/login/', 'POST 401 /api/v1/auth/login/');
  await page.goto('/login');
  await page.getByLabel('Login ID').fill('SA-0001');
  await page.getByLabel('Password').fill('definitely-wrong-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert').first()).toBeVisible();
  await expect(page.getByRole('alert').first()).not.toContainText(
    /reach the server|blocked this request/i,
  );
  await w.assertClean();
});

for (const role of Object.keys(ROLES) as Role[]) {
  test(`${role}: signs in, every nav item and home link opens, logs out`, async ({ page }) => {
    const w = watch(page);
    w.expected.push('403 '); // a role may follow a link the server then refuses: judged below
    await signIn(page, role);
    await pickBranchIfAsked(page, 'Accra Central');
    await open(page, '/');
    const hrefs = new Set<string>();
    for (const a of await page.locator('a[href^="/"]').all()) {
      const h = await a.getAttribute('href');
      if (h && !h.startsWith('/media') && h !== '/login') hrefs.add(h);
    }
    expect(hrefs.size).toBeGreaterThan(2);
    for (const h of hrefs) {
      w.calls.length = 0;
      await open(page, h);
      await pickBranchIfAsked(page, 'Accra Central');
      await expectNotBlank(page);
      await page.waitForLoadState('networkidle');
      // A path the server's menu offers must be a real screen.
      await expect(page.getByRole('heading', { name: 'Page not found' }), h).toHaveCount(0);
      // A role sees only what the API allows: a 403 must come with the "Not allowed" page, never a blank one.
      const forbidden = w.calls.filter((c) => c.status === 403);
      if (forbidden.length) await expect(page.getByRole('heading', { name: /403/ })).toBeVisible();
    }
    await w.assertClean();
    await logOut(page);
  });
}

test('Super Admin creates a user; the new user is forced to change the one-time password', async ({
  page,
  browser,
}) => {
  const w = watch(page);
  await signIn(page, 'super_admin');
  await open(page, '/users/new');
  const name = `E2E Person ${unique()}`;
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Front Staff').check();
  await page.getByRole('button', { name: 'Create user' }).click();
  await expect(page.getByRole('heading', { name: 'One-time password' })).toBeVisible();
  const otp = (await page.locator('code').first().innerText()).trim();
  const loginId = (await page.locator('dd').first().innerText()).trim();
  await w.assertClean();

  const ctx = await browser.newContext();
  const p2 = await ctx.newPage();
  const w2 = watch(p2);
  await p2.goto('/login');
  await p2.getByLabel('Login ID').fill(loginId);
  await p2.getByLabel('Password').fill(otp);
  await p2.getByRole('button', { name: 'Sign in' }).click();
  await expect(p2.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  const fresh = `E2e-${unique()}-Pass-9!x`;
  await p2.getByLabel('One-time password').fill(otp);
  await p2.getByLabel('New password', { exact: true }).fill(fresh);
  await p2.getByLabel('Confirm new password').fill(fresh);
  await p2.getByRole('button', { name: 'Save new password' }).click();
  await expect(p2.getByRole('heading', { name: 'Choose a new password' })).toHaveCount(0);
  await pickBranchIfAsked(p2, 'Accra Central');
  await expect(p2.getByRole('banner').first()).toBeVisible();
  await w2.assertClean();
  await ctx.close();
});

test('Front Staff picks and switches the working branch; own password page opens', async ({
  page,
}) => {
  const w = watch(page);
  await signIn(page, 'front_staff');
  await pickBranchIfAsked(page, 'Accra Central');
  await expectBranch(page, 'Accra Central');
  await openProfileItem(page, /switch working branch/i);
  await page.getByRole('button', { name: /Kumasi/ }).click();
  await expectBranch(page, 'Kumasi');
  await openProfileItem(page, /switch working branch/i);
  await page.getByRole('button', { name: /Accra Central/ }).click();
  await expectBranch(page, 'Accra Central');
  await openProfileItem(page, /change password/i);
  await expect(page.getByRole('heading', { name: 'Change password' })).toBeVisible();
  await w.assertClean();
});

test('password() reads E2E_* variables only', () => {
  expect(() => password('super_admin')).not.toThrow();
});
