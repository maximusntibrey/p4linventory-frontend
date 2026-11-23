import type { Page } from '@playwright/test';
import type { components } from '../src/api/schema';

type S = components['schemas'];

// The production build never uses MSW, so e2e answers the auth calls in the browser instead (no backend needed).
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
const menu = [
  { key: 'home', label: 'Home', path: '/' },
  { key: 'items', label: 'Items', path: '/items' },
  { key: 'warehouse', label: 'Warehouse', path: '/warehouse' },
  { key: 'branches', label: 'Branches', path: '/branches' },
  { key: 'users', label: 'Users', path: '/users' },
] satisfies S['Me']['menu'];
const me = (must: boolean) =>
  ({
    user: { ...user, must_change_password: must },
    active_role: 'super_admin',
    working_branch: null,
    must_change_password: must,
    permissions: ['items.view', 'stock.view', 'branches.view', 'users.view'],
    menu,
  }) satisfies S['Me'];
const error = (code: string, message: string) =>
  ({ code, message, errors: [] }) satisfies S['Error'];

/** Password "wrong" = 401, "locked" = 429 (Retry-After 900), "one-time" = signs in but must change the password. */
export async function stubAuth(page: Page, opts: { signedIn?: boolean } = {}) {
  let signedIn = opts.signedIn ?? false;
  let must = false;
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
          headers: { 'Retry-After': '900' },
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

export const sideways = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
