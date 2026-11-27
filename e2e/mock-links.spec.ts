import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { go, LOGINS, openNav, signIn } from './mock-helpers';

// Link audit (mock mode, all four roles): every internal link on every reachable screen lands on a real route,
// nothing renders blank or logs an error, and a screen the role has no permission for answers 403.

/** Every route in src/routes.tsx with the permission that opens it (null = any signed-in user). */
const ROUTES: { path: string; perm: string | null }[] = [
  { path: '/', perm: null },
  { path: '/account/password', perm: null },
  { path: '/warehouse', perm: 'stock.view' },
  { path: '/audit-logs', perm: 'activity.view' },
  { path: '/shortfalls', perm: 'shortfalls.resolve' },
  { path: '/sell', perm: 'sales.record' },
  { path: '/sales', perm: 'sales.record' },
  { path: '/items', perm: 'items.view' },
  { path: '/items/new', perm: 'items.manage' },
  { path: '/items/1', perm: 'items.view' },
  { path: '/items/import', perm: 'items.import' },
  { path: '/find', perm: 'find.use' },
  { path: '/goods-receipts', perm: 'goods_receipts.manage' },
  { path: '/dispatches', perm: 'dispatches.view' },
  { path: '/dispatches/new', perm: 'dispatches.create' },
  { path: '/receive', perm: 'dispatches.waiting' },
  { path: '/stock', perm: 'stock.view' },
  { path: '/branches', perm: 'branches.view' },
  { path: '/users', perm: 'users.view' },
  { path: '/users/new', perm: 'users.manage' },
  { path: '/users/1', perm: 'users.view' },
];

const NOISE = /Failed to load resource|favicon|DevTools/;

function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !NOISE.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  return errors;
}

const mainText = (page: Page) => page.locator('main').innerText();

/** Client-side navigation, then let the route and its data settle (a reload would drop the in-page mock session). */
async function visit(page: Page, path: string) {
  await page.keyboard.press('Escape'); // never leave the drawer open over the next screen
  await go(page, path);
  await page.waitForFunction((p) => location.pathname === p, path);
  await page.waitForTimeout(500);
  await expect(page.locator('main')).toBeVisible();
}

/** On a phone the links live in the temporary drawer; collect from the drawer and the page. */
async function internalLinks(page: Page) {
  await openNav(page);
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll('a[href]')]
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => h.startsWith('/') && !h.startsWith('//')),
  );
  if (await page.getByRole('button', { name: 'open drawer' }).isVisible()) {
    // keep the drawer from covering the next step
    await page.keyboard.press('Escape');
  }
  return [...new Set(hrefs)];
}

for (const [role, loginId] of Object.entries(LOGINS)) {
  test(`${role}: every internal link lands on a real route; gated routes answer 403`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const errors = watch(page);
    await signIn(page, loginId);
    await expect(page.locator('main')).toBeVisible();
    const perms: string[] = await page.evaluate(async () => {
      const r = await fetch('/api/v1/auth/me/', { credentials: 'include' });
      return ((await r.json()) as { permissions: string[] }).permissions;
    });

    // 1. Links discovered on screens: start at Home, then follow every link found on every screen (one hop).
    const found = new Set<string>(await internalLinks(page));
    const problems: string[] = [];
    for (const href of [...found]) {
      await visit(page, href);
      const text = (await mainText(page)).trim();
      if (!text) problems.push(`${href}: blank page`);
      if (/Page not found/.test(text)) problems.push(`${href}: lands on the 404 page`);
      for (const h of await internalLinks(page)) found.add(h);
    }
    // Follow links first seen on the other screens too (still same origin, bounded by the app's own routes).
    for (const href of [...found]) {
      if (href === '/logout') continue;
      await visit(page, href);
      const text = (await mainText(page)).trim();
      if (!text) problems.push(`${href}: blank page`);
      if (/Page not found/.test(text)) problems.push(`${href}: lands on the 404 page`);
    }
    expect(problems, problems.join('\n')).toEqual([]);

    // 2. Every route: allowed -> a real screen; not allowed -> 403 (a role never reaches a screen its menu hides).
    for (const { path, perm } of ROUTES) {
      await visit(page, path);
      const text = await mainText(page);
      const dynamic = /\/\d+$/.test(path);
      if (perm && !perms.includes(perm)) {
        expect(text, `${role} ${path} should be 403`).toMatch(/403: Not allowed/);
      } else {
        expect(text, `${role} ${path} should open`).not.toMatch(
          dynamic ? /Page not found/ : /Page not found|403: Not allowed/,
        );
        expect(text.trim().length, `${role} ${path} is blank`).toBeGreaterThan(0);
      }
    }

    // 3. Redirects and unknown routes.
    await visit(page, '/activity');
    await page.waitForTimeout(300);
    if (perms.includes('activity.view')) await expect(page).toHaveURL(/\/audit-logs$/);
    await visit(page, '/no-such-page');
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });
}
