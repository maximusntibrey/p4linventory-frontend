import { expect, test } from '@playwright/test';

test('shell loads, has labelled nav, and does not scroll sideways', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Home' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main' }).getByText('Home')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await page.screenshot({ path: `test-results/shell-${info.project.name}.png` });
});

test('unknown route shows the 404 page', async ({ page }) => {
  await page.goto('/does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('keyboard focus is visible', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Log out' }).waitFor();
  await page.keyboard.press('Tab');
  const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
  expect(outline).not.toBe('none');
});
