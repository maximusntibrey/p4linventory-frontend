import { createRequire } from 'node:module';

import { expect, test } from '@playwright/test';
import type { AxeResults } from 'axe-core';

const require = createRequire(import.meta.url);
const axeScriptPath = require.resolve('axe-core/axe.min.js');

test('/ui-kit at 360 px: no sideways scroll, 44 px targets, keyboard, axe', async ({ page }) => {
  await page.goto('/ui-kit');
  await expect(page.getByRole('heading', { level: 1, name: 'UI kit' })).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);

  // Every button and link is at least 44 px in both directions.
  const small: string[] = [];
  for (const el of await page.locator('button, a[href], input').all()) {
    const box = await el.boundingBox();
    if (!box || box.height < 44 || box.width < 44) {
      small.push(`${(await el.textContent()) ?? 'input'}: ${JSON.stringify(box)}`);
    }
  }
  expect(small).toEqual([]);

  // Keyboard: Tab reaches the first control; Enter activates the loading demo button.
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Switch branch' })).toBeFocused();
  const save = page.getByRole('button', { name: 'Save changes' });
  await save.focus();
  await page.keyboard.press('Enter');
  await expect(save).toBeDisabled();

  await page.addScriptTag({ path: axeScriptPath });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: Document) => Promise<AxeResults> } }).axe;
    const results = await axe.run(document);
    return results.violations.map((v) => `${v.id}: ${v.help}`);
  });
  expect(violations).toEqual([]);

  await page.screenshot({ path: 'test-results/ui-kit-360.png', fullPage: true });
});

test('desktop width shows the icon rail', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/ui-kit');
  const box = await page.getByRole('navigation', { name: 'Main menu' }).boundingBox();
  expect(box?.x).toBe(0);
  expect(box?.width).toBeLessThanOrEqual(80);
});
