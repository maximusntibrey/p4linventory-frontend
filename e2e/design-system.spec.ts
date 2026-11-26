import { expect, test } from '@playwright/test';
import { sideways, stubAuth } from './stub';

const tabs = ['Tokens', 'Actions and badges', 'Forms', 'Data', 'Feedback', 'App shell'];

test('design-system showcase: no sideways scroll in any section, buttons are tappable', async ({
  page,
}, info) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/design-system');
  await expect(page.getByRole('heading', { level: 1, name: 'Design system' })).toBeVisible();
  for (const name of tabs) {
    await page.getByRole('tab', { name }).click();
    expect(await sideways(page), `sideways scroll in ${name}`).toBeLessThanOrEqual(0);
    const small = await page.getByRole('button').evaluateAll((els) =>
      els
        .map((e) => ({
          n: e.getAttribute('aria-label') ?? e.textContent?.trim(),
          r: e.getBoundingClientRect(),
        }))
        .filter(({ r }) => r.width > 0 && r.height > 0 && (r.height < 43.5 || r.width < 43.5))
        .map(({ n }) => n),
    );
    expect(small, `tap targets under 44 px in ${name}`).toEqual([]);
  }
  await page.getByRole('tab', { name: 'Actions and badges' }).click();
  await page.screenshot({
    path: `test-results/design-system-${info.project.name}.png`,
    fullPage: true,
  });
});

test('design-system showcase: keyboard focus ring is visible on tabs', async ({ page }) => {
  await stubAuth(page, { signedIn: true });
  await page.goto('/design-system');
  await page.getByRole('tab', { name: 'Tokens' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Actions and badges' })).toBeFocused();
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe('none');
});
