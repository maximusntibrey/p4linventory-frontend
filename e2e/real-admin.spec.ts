import { expect, test } from '@playwright/test';
import { expectNotBlank, open, signIn, unique, watch } from './real-helpers';

/** The branch list is paged: walk the pages (from the first) until `text` shows. */
async function findRow(page: import('@playwright/test').Page, text: string | RegExp) {
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { name: 'Branches', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Edit / }).first()).toBeVisible();
  for (let i = 0; i < 20; i++) {
    const hit = page.getByText(text).first();
    if (await hit.isVisible()) return hit;
    const next = page
      .getByRole('button', { name: 'Next', exact: true })
      .locator('visible=true')
      .first();
    if (!(await next.isVisible()) || (await next.isDisabled())) break;
    const loaded = page.waitForResponse(
      (r) => r.url().includes('/api/v1/branches/') && r.request().method() === 'GET',
    );
    await next.click();
    await loaded;
    // the new page's rows replace the old ones a moment after the answer arrives
    await hit.waitFor({ timeout: 2000 }).catch(() => undefined);
  }
  throw new Error(`row not found: ${text}`);
}

test('Super Admin: CSV import, dry run then confirm', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'super_admin');
  await open(page, '/items/import');
  await page.getByLabel('CSV file').setInputFiles({
    name: 'opening.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('sku,opening_quantity,unit_cost\nSKU-000001,1,2000.00\n'),
  });
  await page.getByLabel('Location').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Check the file' }).click();
  await page.getByRole('button', { name: 'Import now' }).click();
  await expect(page.getByRole('button', { name: 'Import another file' })).toBeVisible();
  await w.assertClean();
});

test('Super Admin: a bad CSV is reported by row, nothing is imported', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'super_admin');
  await open(page, '/items/import');
  await page.getByLabel('CSV file').setInputFiles({
    name: 'bad.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('sku,opening_quantity,unit_cost\nNO-SUCH-SKU,abc,-1\n'),
  });
  await page.getByLabel('Location').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Check the file' }).click();
  await expect(page.getByLabel('Errors by row')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import now' })).toHaveCount(0);
  await w.assertClean();
});

test('Super Admin: users list, search, add, detail, reset password, deactivate', async ({
  page,
}) => {
  const w = watch(page);
  await signIn(page, 'super_admin');
  await open(page, '/users');
  await page.getByLabel('Search by name or login ID').fill('USR-0003');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByRole('link', { name: /USR-0003|Front/ }).first()).toBeVisible();

  await open(page, '/users/new');
  const name = `E2E Staff ${unique()}`;
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Front Staff').check();
  await page.getByRole('button', { name: 'Create user' }).click();
  await expect(page.getByRole('heading', { name: 'One-time password' })).toBeVisible();
  await page
    .getByRole('button', { name: /done|back to users|i have/i })
    .first()
    .click();

  await open(page, '/users');
  await page.getByLabel('Search by name or login ID').fill(name);
  await page.getByRole('button', { name: 'Search' }).click();
  await page.getByRole('link', { name }).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await expectNotBlank(page);

  await page.getByRole('button', { name: 'Reset password' }).click();
  await page.getByRole('button', { name: 'Yes, reset password' }).click();
  await expect(page.getByRole('heading', { name: 'One-time password' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Deactivate' }).click();
  await page.getByRole('button', { name: 'Yes, deactivate' }).click();
  await expect(page.getByText(/deactivated/i).first()).toBeVisible();
  await w.assertClean();
});

test('Super Admin: branches list, filter, create both types, edit', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'super_admin');
  await open(page, '/branches');
  // filter by type, then back to all
  await page.getByRole('radio', { name: 'Warehouse' }).check({ force: true });
  await expectNotBlank(page);
  await page.getByRole('radio', { name: 'All types' }).check({ force: true });
  const tag = unique();
  for (const [type, label] of [
    ['Normal Branch', 'Branch'],
    ['Warehouse', 'Store'],
  ] as const) {
    await page.getByRole('button', { name: 'Add a branch' }).click();
    await page.getByLabel('Code', { exact: true }).fill(`E${type[0]}${tag}`.slice(0, 10));
    await page.getByLabel('Name', { exact: true }).fill(`E2E ${label} ${tag}`);
    await page.locator('form').getByText(type, { exact: true }).click();
    await expect(page.locator('form').getByRole('radio', { name: type })).toBeChecked();
    const saved = page.waitForResponse(
      (r) => r.url().includes('/api/v1/branches/') && r.request().method() === 'POST',
    );
    await page.getByRole('button', { name: 'Save branch' }).click();
    expect((await saved).status()).toBe(201);
    await findRow(page, `E2E ${label} ${tag}`);
  }
  await findRow(page, `E2E Branch ${tag}`);
  await page.getByRole('button', { name: `Edit E2E Branch ${tag}` }).click();
  await page.getByLabel('Name', { exact: true }).fill(`E2E Branch ${tag} renamed`);
  const patched = page.waitForResponse(
    (r) => r.url().includes('/api/v1/branches/') && r.request().method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Save branch' }).click();
  expect((await patched).status()).toBe(200);
  // leave the dev data as found: the two places made here are deactivated again
  for (const n of [`E2E Branch ${tag} renamed`, `E2E Store ${tag}`]) {
    await findRow(page, n);
    await page.getByRole('button', { name: `Deactivate ${n}` }).click();
    await page.getByRole('button', { name: 'Yes, deactivate' }).click();
    await expect(page.getByRole('button', { name: `Activate ${n}` })).toBeVisible();
  }
  await w.assertClean();
});

test('Super Admin: audit logs list, filter, export', async ({ page }) => {
  const w = watch(page);
  await signIn(page, 'super_admin');
  await open(page, '/audit-logs');
  await expect(page.getByRole('heading', { name: 'Audit Logs', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Filter' }).click();
  await page.getByLabel('Module', { exact: true }).fill('item');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expectNotBlank(page);
  const exported = page.waitForResponse((r) => r.url().includes('/activity-log/export/'));
  await page.getByRole('button', { name: 'Export CSV' }).click();
  expect((await exported).status()).toBe(200);
  await expect(page.getByRole('button', { name: /Export CSV/ })).toBeVisible();
  await w.assertClean();
});
