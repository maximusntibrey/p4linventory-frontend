import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { components } from '../src/api/schema';
import { sideways, stubAuth, stubData } from './stub';

type S = components['schemas'];

const accra = {
  id: 2,
  kind: 'branch',
  branch_type: 'branch',
  code: 'ACC',
  name: 'Accra Branch With A Rather Long Name',
  is_active: true,
} satisfies S['Branch'];
const warehouse = {
  id: 1,
  kind: 'warehouse',
  branch_type: 'warehouse',
  code: 'WH',
  name: 'Central Warehouse',
  is_active: true,
} satisfies S['Branch'];
const event = (id: number): S['ActivityEvent'] => ({
  id,
  occurred_at: '2026-11-24T10:00:00Z',
  user_id: 4,
  user_login_id: 'USR-0003',
  user_role: 'warehouse_admin',
  branch_id: 1,
  branch_name: 'Central Warehouse',
  action: 'dispatch_created',
  target_type: 'dispatch',
  target_ref: `TRF-00000${id}`,
  is_self_approval: id === 2,
});
const shortfall = {
  id: 4,
  dispatch_id: 3,
  dispatch_reference: 'TRF-000003',
  origin: warehouse,
  destination: accra,
  item_id: 1,
  sku: 'SKU-000001',
  item_name: 'HP 250 G9',
  qty_sent: 5,
  qty_accepted: 3,
  shortfall: 2,
  resolved_quantity: 0,
  remaining: 2,
  status: 'open',
  received_at: '2026-11-24T09:00:00Z',
  resolutions: [],
} satisfies S['Shortfall'];
const page1 = <T>(results: T[]) => ({
  count: results.length,
  page: 1,
  page_size: 25,
  next: null,
  previous: null,
  results,
});

async function setup(page: Page, permissions: S['Me']['permissions']) {
  await stubAuth(page, { signedIn: true });
  await stubData(page);
  // Registered after stubAuth, so these win.
  await page.route('**/api/v1/auth/me/', (route) =>
    route.fulfill({
      json: {
        user: {
          id: 1,
          login_id: 'SA-0001',
          full_name: 'Ama Mensah',
          status: 'active',
          roles: ['super_admin'],
          permanent_location_id: null,
          must_change_password: false,
          permissions: [],
        },
        active_role: 'super_admin',
        working_branch: null,
        must_pick_branch: false,
        all_branches: true,
        can_assign_multiple_roles: true,
        must_change_password: false,
        permissions,
        menu: [{ key: 'home', label: 'Home', path: '/' }],
        home_links: [
          { key: 'activity', label: 'Activity', path: '/activity' },
          { key: 'shortfalls', label: 'Shortfalls', path: '/shortfalls' },
        ],
      } satisfies S['Me'],
    }),
  );
}

test('shortfalls: resolve with a confirm step by keyboard; 360 px, 44 px targets, no sideways scroll', async ({
  page,
}) => {
  await setup(page, ['shortfalls.resolve', 'dashboard.view']);
  const posted: { body: unknown; key: string | null }[] = [];
  let open = true;
  await page.route('**/api/v1/shortfalls/**', (route) => {
    const req = route.request();
    if (req.method() === 'POST') {
      posted.push({ body: req.postDataJSON(), key: req.headers()['idempotency-key'] ?? null });
      open = false;
      return route.fulfill({
        json: {
          ...shortfall,
          resolved_quantity: 2,
          remaining: 0,
          status: 'resolved',
          resolutions: [
            {
              reference: 'RES-000001',
              action: 'confirm_loss',
              quantity: 2,
              note: 'Lost in transit',
              resolved_by: 'SA-0001',
              resolved_role: 'super_admin',
              resolved_at: '2026-11-24T11:00:00Z',
              is_self_approval: false,
            },
          ],
        } satisfies S['Shortfall'],
      });
    }
    return route.fulfill({ json: page1(open ? [shortfall] : []) });
  });
  await page.goto('/shortfalls');
  await expect(page.getByRole('heading', { level: 1, name: 'Shortfalls' })).toBeVisible();
  await expect(page.getByText('Remaining 2')).toBeVisible();
  const resolve = page.getByRole('button', { name: /Resolve shortfall of HP 250 G9/ });
  expect((await resolve.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await resolve.focus();
  await page.keyboard.press('Enter');
  const panel = page.getByRole('group', { name: /Resolve the shortfall of HP 250 G9/ });
  await expect(panel).toBeFocused();
  await page.getByLabel('Resolution').selectOption('confirm_loss');
  await page.getByLabel('Note').fill('Lost in transit');
  expect(await sideways(page)).toBeLessThanOrEqual(0);
  const confirm = page.getByRole('button', { name: 'Confirm resolution' });
  expect((await confirm.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await confirm.click();
  await expect(
    page.getByRole('status').filter({ hasText: /RES-000001 recorded for HP 250 G9/ }),
  ).toBeFocused();
  expect(posted).toHaveLength(1);
  expect(posted[0].body).toEqual({
    resolution: 'confirm_loss',
    quantity: 2,
    note: 'Lost in transit',
  });
  expect(posted[0].key).toBeTruthy();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('activity: filters and events, no sideways scroll at 360 px', async ({ page }) => {
  await setup(page, ['activity.view', 'branches.view']);
  await page.route('**/api/v1/activity-log/**', (route) =>
    route.fulfill({ json: page1([event(3), event(2), event(1)]) }),
  );
  await page.goto('/activity');
  await expect(page.getByRole('heading', { level: 1, name: 'Activity' })).toBeVisible();
  await expect(page.getByText('TRF-000003')).toBeVisible();
  await expect(page.getByText('Self-approved')).toBeVisible();
  for (const l of ['Branch', 'Action', 'From date', 'To date']) {
    const box = await page.getByLabel(l, { exact: true }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  const apply = page.getByRole('button', { name: 'Apply filters' });
  expect((await apply.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(page.getByText(/cost/i)).toHaveCount(0);
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});

test('home: low stock and recent activity lists, no sideways scroll at 360 px', async ({
  page,
}) => {
  await setup(page, ['dashboard.view', 'activity.view', 'shortfalls.resolve']);
  await page.route('**/api/v1/dashboard/', (route) =>
    route.fulfill({
      json: {
        role: 'super_admin',
        location: null,
        waiting_dispatches: 1,
        in_transit_dispatches: 2,
        active_items: 3,
        low_stock_count: 1,
        low_stock: [
          {
            location_id: 2,
            location_name: accra.name,
            item_id: 1,
            sku: 'SKU-000001',
            item_name: 'HP 250 G9',
            available: 2,
            reorder_level: 5,
          },
        ],
        recent_activity: [event(2), event(1)],
      } satisfies S['Dashboard'],
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 2, name: 'Low stock' })).toBeVisible();
  await expect(page.getByText('1 to reorder')).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Recent activity' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Shortfalls' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Activity' }).first()).toBeVisible();
  expect(await sideways(page)).toBeLessThanOrEqual(0);
});
