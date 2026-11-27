import { expect, test } from '@playwright/test';
import { LOGINS, signIn } from './mock-helpers';

// Every role lands on a working Home: a heading, real cards, no 403 and no blank page.
for (const [role, loginId] of Object.entries(LOGINS)) {
  test(`${role}: lands on Home with cards and no 403`, async ({ page }) => {
    await signIn(page, loginId);
    await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
    await expect(page.getByText('Quick actions')).toBeVisible();
    await page.waitForTimeout(800);
    const text = await page.locator('main').innerText();
    expect(text).not.toMatch(/403|Not allowed/);
    expect(text.trim().length).toBeGreaterThan(40);
  });
}
