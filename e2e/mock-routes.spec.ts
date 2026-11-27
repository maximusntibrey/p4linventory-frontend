import { expect, test } from '@playwright/test';
import { go, LOGINS, signIn } from './mock-helpers';

// Every route of the app. A route a role may not open shows the 403 page, which must also be error free.
const ROUTES = [
  '/',
  '/account/password',
  '/warehouse',
  '/audit-logs',
  '/activity',
  '/shortfalls',
  '/sell',
  '/sell/sales',
  '/items/import',
  '/find',
  '/goods-receipts',
  '/dispatches',
  '/dispatches/new',
  '/receive',
  '/receive/1',
  '/items',
  '/items/new',
  '/items/1',
  '/stock',
  '/branches',
  '/users',
  '/users/new',
  '/users/1',
  '/design-system',
  '/no-such-page',
];

for (const [role, loginId] of Object.entries(LOGINS)) {
  test(`${role}: every route renders with no console error and no sideways scroll`, async ({
    page,
  }) => {
    test.setTimeout(180_000);
    const problems: string[] = [];
    page.on('pageerror', (e) => problems.push(`pageerror ${e.message}`));
    page.on('console', (m) => {
      // The browser logs every 403 or 404 the mock API answers on purpose; those are not app errors.
      if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) {
        problems.push(`console ${m.text()}`);
      }
    });
    await signIn(page, loginId);
    for (const path of ROUTES) {
      await go(page, path);
      await expect(page.getByRole('main')).toBeVisible();
      await page.waitForLoadState('networkidle');
      // Something real rendered: a page title or the working-branch picker.
      await expect(page.locator('h1, h2').first(), path).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
    }
    expect(problems).toEqual([]);
  });
}
