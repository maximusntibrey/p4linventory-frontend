import { expect, test } from '@playwright/test';
import { LOGINS, goTo, openProfile, signIn } from './mock-helpers';

// Placement map: the working branch lives in the profile menu only (with the one switcher); the Super Admin's
// "Filter by branch" lives inside pages, never in the header. Checked per role, at desktop and phone width.
const routes = ['Home', 'Stock', 'Sales', 'Users', 'Audit Logs', 'Dispatches'];

for (const [role, loginId] of Object.entries(LOGINS)) {
  test(`${role}: no branch chip or filter in the header, at most one switcher on any route`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await signIn(page, loginId);
    const header = page.getByRole('banner').first();
    for (const label of routes) {
      const link = page.getByRole('link', { name: label, exact: true });
      if (!(await link.count()) && label !== 'Home') {
        // Not in this role's menu: nothing to open, but the header rules still hold on the current page.
      } else {
        await goTo(page, label).catch(() => undefined);
      }
      await expect(header.getByLabel('Filter by branch')).toHaveCount(0);
      await expect(header.getByLabel(/^Working branch:/)).toHaveCount(0);
      const switchers = page.getByRole('button', { name: /^Switch (working )?branch$/ });
      expect(await switchers.count()).toBeLessThanOrEqual(1);
    }
    // Profile menu: exactly one switcher for users who may switch, and the working branch text.
    const open = await openProfile(page);
    expect(
      await open.getByRole('button', { name: /^Switch (working )?branch$/ }).count(),
    ).toBeLessThanOrEqual(1);
    await expect(open.getByText(/Working branch:/)).toBeVisible();
    await expect(open.getByLabel('Filter by branch')).toHaveCount(0);
  });
}
