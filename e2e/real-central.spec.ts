import { expect, test } from '@playwright/test';
import { expectNotBlank, open, signIn, watch } from './real-helpers';

test('central warehouse user: lands on a working page and everything is read-only', async ({
  page,
}) => {
  const w = watch(page);
  w.expected.push('403 '); // the write screens answer 403 and show the Not allowed page
  await signIn(page, 'central_warehouse');
  await open(page, '/');
  await expect(page).toHaveURL(/\/stock/);
  await expect(page.getByRole('heading', { name: 'Stock', level: 1 })).toBeVisible();

  await open(page, '/receive-stock');
  await expect(page.getByRole('heading', { name: 'Receipts', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: /review receipt/i })).toHaveCount(0);
  await expect(page.getByText(/GHS/)).toHaveCount(0); // no cost for this role

  await open(page, '/dispatch');
  await expect(page.getByRole('heading', { name: 'Dispatch', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /new dispatch/i })).toHaveCount(0);

  await open(page, '/dispatches/new');
  await expect(page.getByRole('heading', { name: /403/ })).toBeVisible();
  await open(page, '/find');
  await expectNotBlank(page);
  await w.assertClean();
});
