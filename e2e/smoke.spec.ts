import { createRequire } from 'node:module';

import { expect, test } from '@playwright/test';
import type { AxeResults } from 'axe-core';

const require = createRequire(import.meta.url);
const axeScriptPath = require.resolve('axe-core/axe.min.js');

test('built app loads at 360 px with no sideways scroll and no axe violations', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { level: 1, name: 'Payless4Laptops Inventory' }),
  ).toBeVisible();

  const sidewaysOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(sidewaysOverflow).toBe(0);

  // Full axe run in a real browser, including colour contrast.
  await page.addScriptTag({ path: axeScriptPath });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run: (ctx: Document) => Promise<AxeResults> } }).axe;
    const results = await axe.run(document);
    return results.violations.map((v) => `${v.id}: ${v.help}`);
  });
  expect(violations).toEqual([]);
});

test('/ui-kit is absent from the production build', async ({ page }) => {
  await page.goto('/ui-kit');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Payless4Laptops Inventory' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /UI kit/i })).toHaveCount(0);
});
