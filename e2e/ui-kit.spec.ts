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

test('accent fill with white text passes axe colour contrast at 360 px', async ({ page }) => {
  await page.goto('/ui-kit');
  const save = page.getByRole('button', { name: 'Save', exact: true });
  const colours = await save.evaluate((el) => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, fg: s.color };
  });
  expect(colours).toEqual({ bg: 'rgb(194, 65, 12)', fg: 'rgb(255, 255, 255)' });

  await page.addScriptTag({ path: axeScriptPath });
  const result = await page.evaluate(async () => {
    const axe = (
      window as unknown as {
        axe: {
          run: (
            ctx: string,
            opts: { runOnly: string[] },
          ) => Promise<{ violations: unknown[]; passes: { nodes: unknown[] }[] }>;
        };
      }
    ).axe;
    const r = await axe.run('button:not([disabled])', { runOnly: ['color-contrast'] });
    return { violations: r.violations.length, passes: r.passes.length };
  });
  expect(result.violations).toBe(0);
  expect(result.passes).toBeGreaterThan(0);
});

test('keyboard focus ring is visible (computed outline)', async ({ page }) => {
  await page.goto('/ui-kit');
  const save = page.getByRole('button', { name: 'Save', exact: true });
  await save.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(save).toBeFocused();
  const outline = await save.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: s.outlineWidth, colour: s.outlineColor };
  });
  expect(outline).toEqual({ style: 'solid', width: '2px', colour: 'rgb(234, 88, 12)' });
});

test('self-hosted fonts load (Bebas Neue headings, Inter body)', async ({ page }) => {
  await page.goto('/ui-kit');
  await page.evaluate(async () => {
    await document.fonts.load("1em 'Bebas Neue'");
    await document.fonts.load("1em 'Inter'");
    await document.fonts.load("600 1em 'Inter'");
  });
  const loaded = await page.evaluate(() => {
    const out: string[] = [];
    document.fonts.forEach((f) => {
      if (f.status === 'loaded') out.push(`${f.family}:${f.weight}`);
    });
    return out;
  });
  expect(loaded).toEqual(expect.arrayContaining(['Bebas Neue:400', 'Inter:400', 'Inter:600']));
  const h1 = await page
    .getByRole('heading', { level: 1 })
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(h1).toContain('Bebas Neue');
  const body = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
  expect(body).toContain('Inter');
});
