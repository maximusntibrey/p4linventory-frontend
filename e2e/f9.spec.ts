import { expect, test } from '@playwright/test';
import { sideways, stubAuth, stubData } from './stub';

test('UI consistency: 360 px, 44 px targets and no sideways scroll across main lists', async ({
  page,
}) => {
  await stubAuth(page, { signedIn: true });
  await stubData(page);

  for (const path of ['/items', '/stock', '/warehouse', '/sales', '/find']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await sideways(page)).toBeLessThanOrEqual(0);
  }

  await page.goto('/items');
  await page.waitForLoadState('networkidle');
  const actions = page.getByRole('button');
  if ((await actions.count()) > 0) {
    for (let i = 0; i < (await actions.count()); i++) {
      const box = await actions.nth(i).boundingBox();
      if (box) expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test('list performance: item and stock pages respond within two seconds', async ({ page }) => {
  await stubAuth(page, { signedIn: true });
  await stubData(page);

  for (const path of ['/items', '/stock']) {
    const started = Date.now();
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(Date.now() - started).toBeLessThan(2000);
  }
});
