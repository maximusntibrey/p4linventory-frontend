import type { Page } from '@playwright/test';
import type { components } from '../src/api/schema';

type S = components['schemas'];

// The production build never uses MSW, so e2e answers the API calls in the browser instead (no backend needed).
const user = {
  id: 1,
  login_id: 'SA-0001',
  full_name: 'Ama Mensah',
  status: 'active',
  roles: ['super_admin'],
  permanent_location_id: null,
  must_change_password: false,
  permissions: [],
} satisfies S['User'];
const frontStaff = {
  id: 3,
  login_id: 'USR-0002',
  full_name: 'Esi Owusu',
  status: 'active',
  roles: ['front_staff'],
  permanent_location_id: null,
  must_change_password: false,
  permissions: [],
} satisfies S['User'];
const menu = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'items', label: 'Items', path: '/items' },
  { key: 'warehouse', label: 'Warehouse', path: '/warehouse' },
  { key: 'branches', label: 'Branches', path: '/branches' },
  { key: 'users', label: 'Users', path: '/users' },
] satisfies S['Me']['menu'];
const fsMenu = [
  { key: 'find', label: 'Find', path: '/find' },
  { key: 'stock', label: 'Stock', path: '/stock' },
] satisfies S['Me']['menu'];
const t = '2026-11-23T14:05:00Z';
export const branches = [
  {
    id: 1,
    kind: 'warehouse',
    branch_type: 'warehouse',
    code: 'WH',
    name: 'Central Warehouse',
    is_active: true,
  },
  {
    id: 2,
    kind: 'branch',
    branch_type: 'branch',
    code: 'ACC',
    name: 'Accra Branch',
    is_active: true,
  },
  {
    id: 3,
    kind: 'branch',
    branch_type: 'branch',
    code: 'KUM',
    name: 'Kumasi Branch',
    is_active: true,
  },
] satisfies S['Branch'][];

type Opts = {
  signedIn?: boolean;
  /** Front Staff: the API lets them pick a working branch (none chosen yet). Default is the Super Admin. */
  frontStaff?: boolean;
};

const error = (code: string, message: string) =>
  ({ code, message, errors: [] }) satisfies S['Error'];

/** Password "wrong" = 401, "locked" = 429 (Retry-After 900), "one-time" = signs in but must change the password. */
export async function stubAuth(page: Page, opts: Opts = {}) {
  let signedIn = opts.signedIn ?? false;
  let must = false;
  let working: S['Branch'] | null = null;
  const me = (mustChange: boolean): S['Me'] =>
    opts.frontStaff
      ? {
          user: { ...frontStaff, must_change_password: mustChange },
          active_role: 'front_staff',
          working_branch: working,
          must_pick_branch: working === null,
          all_branches: false,
          can_assign_multiple_roles: false,
          must_change_password: mustChange,
          permissions: ['working_branch.select', 'items.view', 'stock.view'],
          menu: fsMenu,
          home_links: [],
        }
      : {
          user: { ...user, must_change_password: mustChange },
          active_role: 'super_admin',
          working_branch: null,
          must_pick_branch: false,
          all_branches: true,
          can_assign_multiple_roles: true,
          must_change_password: mustChange,
          home_links: [],
          permissions: [
            'dashboard.view',
            'items.view',
            'items.manage',
            'items.import',
            'items.view_cost',
            'prices.manage',
            'stock.view',
            'branches.view',
            'branches.manage',
            'users.view',
            'users.manage',
            'goods_receipts.manage',
            'dispatches.create',
            'dispatches.view',
            'dispatches.waiting',
            'dispatches.receive',
          ],
          menu,
        };
  await page.route('**/api/v1/working-branch/', async (route) => {
    if (route.request().method() !== 'PUT') {
      return route.fulfill({ json: { working_branch: working } });
    }
    const { branch_id } = route.request().postDataJSON() as { branch_id: number };
    working = branches.find((b) => b.id === branch_id) ?? null;
    return route.fulfill({ json: me(false) });
  });
  await page.route('**/api/v1/auth/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/csrf/')) return route.fulfill({ json: { csrf_token: 'e2e-token' } });
    if (path.endsWith('/me/')) {
      return signedIn
        ? route.fulfill({ json: me(must) })
        : route.fulfill({ status: 401, json: error('not_authenticated', 'Log in to continue.') });
    }
    if (path.endsWith('/logout/')) {
      signedIn = false;
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/password/')) {
      must = false;
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/login/')) {
      const { password } = route.request().postDataJSON() as { password: string };
      if (password === 'wrong') {
        return route.fulfill({
          status: 401,
          json: error('invalid_credentials', 'Login ID or password is not right.'),
        });
      }
      if (password === 'locked') {
        return route.fulfill({
          status: 429,
          headers: {
            'Retry-After': '900',
            'Access-Control-Expose-Headers': 'Retry-After',
          },
          json: error('rate_limited', 'Too many failed attempts.'),
        });
      }
      signedIn = true;
      must = password === 'one-time';
      return route.fulfill({ json: me(must) });
    }
    return route.fallback();
  });
}

const page1 = <T>(results: T[]) => ({
  count: results.length,
  page: 1,
  page_size: 25,
  next: null,
  previous: null,
  results,
});

/** Branch, user and dashboard answers for the F3 screens. The user created here shows up in the list afterwards. */
export async function stubData(page: Page) {
  const people: S['User'][] = [user];
  const dashboard = {
    role: 'super_admin',
    location: null,
    waiting_dispatches: 0,
    in_transit_dispatches: 0,
    active_items: 3,
    low_stock_count: 0,
    low_stock: [],
    recent_activity: [],
  } satisfies S['Dashboard'];
  await page.route('**/api/v1/dashboard/', (route) => route.fulfill({ json: dashboard }));
  await page.route('**/api/v1/branches/**', (route) => {
    const url = new URL(route.request().url());
    const kind = url.searchParams.get('kind');
    return route.fulfill({
      json: page1(
        branches
          .filter((b) => !kind || b.kind === kind)
          .map((b) => ({ ...b, created_at: t, updated_at: t })),
      ),
    });
  });
  await page.route('**/api/v1/users/**', async (route) => {
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { full_name: string; roles: S['RoleCode'][] };
      const created = {
        id: 10,
        login_id: 'USR-0010',
        full_name: body.full_name,
        status: 'pending_activation',
        roles: body.roles,
        permanent_location_id: null,
        must_change_password: true,
        permissions: [],
      } satisfies S['User'];
      people.push(created);
      return route.fulfill({
        status: 201,
        json: {
          ...created,
          one_time_password: 'E2E-One-Time-9137',
          one_time_password_expires_at: '2026-11-26T14:05:00Z',
        } satisfies S['UserWithOneTimePassword'],
      });
    }
    return route.fulfill({ json: page1(people) });
  });
}

export const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
