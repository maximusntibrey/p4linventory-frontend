import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/** Dev logins of the local backend. Passwords come from E2E_* variables, never from code. */
export const ROLES = {
  super_admin: { login: 'SA-0001', env: 'E2E_SA_0001_PASSWORD' },
  warehouse_admin: { login: 'USR-0001', env: 'E2E_WAREHOUSE_ADMIN_PASSWORD' },
  branch_admin: { login: 'USR-0002', env: 'E2E_BRANCH_ADMIN_PASSWORD' },
  front_staff: { login: 'USR-0003', env: 'E2E_FRONT_STAFF_PASSWORD' },
} as const;
export type Role = keyof typeof ROLES;

export const API = 'http://localhost:8000';
export const unique = () => Date.now().toString(36).toUpperCase();

export type Watch = {
  calls: { method: string; url: string; status: number }[];
  consoleErrors: string[];
  pageErrors: string[];
  /** 4xx/5xx the test judged correct (substring of "METHOD status path"). */
  expected: string[];
  /** Fails the test on any unexpected failure, banner or blank page. */
  assertClean: () => Promise<void>;
};

const BANNER = /server cannot be reached|could not reach the server/i;

/** Records every API call, console error and page error for the page. */
export function watch(page: Page): Watch {
  const w: Watch = {
    calls: [],
    consoleErrors: [],
    pageErrors: [],
    expected: [],
    assertClean: async () => {
      const bad = w.calls.filter(
        (c) =>
          (c.status === 0 || c.status >= 400) &&
          !w.expected.some((e) => `${c.method} ${c.status} ${new URL(c.url).pathname}`.includes(e)),
      );
      expect(bad, 'unexpected failing API calls').toEqual([]);
      const errs = w.consoleErrors.filter(
        (m) =>
          !/Failed to load resource: the server responded with a status of 4\d\d/.test(m) || false,
      );
      expect(errs, 'console errors').toEqual([]);
      expect(w.pageErrors, 'uncaught page errors').toEqual([]);
      await expect(page.getByText(BANNER)).toHaveCount(0);
      await expect(page.getByText(/something went wrong while showing this page/i)).toHaveCount(0);
      expect((await page.locator('body').innerText()).trim().length, 'blank page').toBeGreaterThan(
        20,
      );
    },
  };
  page.on('response', (r) => {
    if (r.url().startsWith(API))
      w.calls.push({ method: r.request().method(), url: r.url(), status: r.status() });
  });
  page.on('requestfailed', (r) => {
    if (r.url().startsWith(API)) w.calls.push({ method: r.method(), url: r.url(), status: 0 });
  });
  page.on('console', (m) => {
    if (m.type() === 'error') w.consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => w.pageErrors.push(String(e)));
  page.on('dialog', (d) => void d.dismiss());
  page.addInitScript(() =>
    addEventListener('unhandledrejection', (e) => console.error('UNHANDLED REJECTION', e.reason)),
  );
  return w;
}

export function password(role: Role): string {
  const v = process.env[ROLES[role].env];
  if (!v) throw new Error(`Set ${ROLES[role].env} to run the real-API specs.`);
  return v;
}

export async function signIn(page: Page, role: Role) {
  await page.goto('/login');
  await page.getByLabel('Login ID').fill(ROLES[role].login);
  await page.getByLabel('Password').fill(password(role));
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('banner').first()).toBeVisible();
}

/** Full navigation (a real reload; the cookie session survives, unlike mock mode). */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('banner').first()).toBeVisible();
}

/** A valid 1x1 PNG for picture uploads. */
export const PNG = {
  name: 'pixel.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  ),
};

/** Picks the first real option of a select (index 0 is the placeholder). */
export async function pickFirst(page: Page, label: string) {
  const select = page.getByLabel(label, { exact: true });
  await expect(select.locator('option')).not.toHaveCount(1);
  await select.selectOption({ index: 1 });
}

/** Every page of the app a role can open must show something. */
export async function expectNotBlank(page: Page) {
  await expect(async () => {
    expect((await page.locator('main').innerText()).trim().length).toBeGreaterThan(5);
  }).toPass();
}
