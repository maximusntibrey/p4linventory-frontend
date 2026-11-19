// F1.4: with VITE_API_MODE=mock the browser worker answers /api/v1 from contract-shaped examples.
import { expect, test } from '@playwright/test';

test('mock mode answers the API from MSW', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#root')).not.toBeEmpty();
  const result = await page.evaluate(async () => {
    const session = await fetch('/api/v1/auth/session/');
    const me = await fetch('/api/v1/auth/me/');
    return { session: (await session.json()) as unknown, meStatus: me.status };
  });
  expect(result.session).toEqual({ authenticated: false, needs_branch_selection: false });
  expect(result.meStatus).toBe(401);
});
