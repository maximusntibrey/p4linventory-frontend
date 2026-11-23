import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { handlers, mockSession } from './handlers';

// Reads the contract copy by regex: paths sit at 2 spaces, methods at 4 (shape of the published file).
function contractOperations(): string[] {
  const ops: string[] = [];
  let path = '';
  for (const line of readFileSync('contract/openapi.yaml', 'utf8').split(/\r?\n/)) {
    const p = /^ {2}(\/\S*):\s*$/.exec(line);
    if (p) path = p[1];
    const m = /^ {4}(get|post|put|patch|delete):\s*$/.exec(line);
    if (m && path) ops.push(`${m[1].toUpperCase()} ${path.replace(/\{(\w+)\}/g, ':$1')}`);
  }
  return ops;
}

describe('MSW handlers cover the contract', () => {
  const have = handlers.map((h) => {
    const { method, path } = (h as unknown as { info: { method: string; path: string } }).info;
    return `${method} ${path}`;
  });

  it('finds the operations in the contract', () => {
    expect(contractOperations().length).toBeGreaterThan(40);
  });

  it.each(contractOperations())('has a handler for %s', (op) => {
    expect(have).toContain(op);
  });

  it('has no handler outside the contract', () => {
    expect(have.filter((h) => !contractOperations().includes(h))).toEqual([]);
  });
});

describe('mock server behaviour', () => {
  const send = (
    method: string,
    path: string,
    headers: Record<string, string> = {},
    body?: unknown,
  ) =>
    fetch(new URL(path, globalThis.location.origin), {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const K = { 'X-CSRFToken': 't', 'Idempotency-Key': 'k-1' };

  it.each([
    ['POST', '/api/v1/auth/logout/'],
    ['PUT', '/api/v1/working-branch/'],
    ['PATCH', '/api/v1/branches/2/'],
    ['POST', '/api/v1/auth/login/'],
  ])('rejects %s %s without X-CSRFToken with 403 csrf_failed', async (method, path) => {
    mockSession.loggedIn = true;
    const res = await send(method, path, {}, {});
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: 'csrf_failed' });
  });

  it('accepts an unsafe request that carries the token, and never needs it on GET', async () => {
    mockSession.loggedIn = true;
    expect((await send('POST', '/api/v1/auth/logout/', { 'X-CSRFToken': 't' })).status).toBe(204);
    mockSession.loggedIn = true;
    expect((await send('GET', '/api/v1/auth/me/')).status).toBe(200);
  });

  it('does not copy unknown request fields into responses', async () => {
    mockSession.loggedIn = true;
    const res = await send('PATCH', '/api/v1/items/1/', K, {
      name: 'Renamed',
      average_cost: '1.00',
      is_superuser: true,
      id: 99,
    });
    const row = await res.json();
    expect(row).toMatchObject({ id: 1, name: 'Renamed', average_cost: '900.00' });
    expect(row).not.toHaveProperty('is_superuser');
  });

  // Every state-changing operation of the contract except login, logout and password change.
  const keyed: [string, string, unknown?][] = [
    ['PUT', '/api/v1/working-branch/', { branch_id: 2 }],
    ['POST', '/api/v1/branches/', { code: 'X', name: 'X' }],
    ['PATCH', '/api/v1/branches/2/', {}],
    ['POST', '/api/v1/branches/3/deactivate/'],
    ['POST', '/api/v1/branches/3/activate/'],
    ['POST', '/api/v1/users/', { full_name: 'N', roles: ['branch_admin'] }],
    ['PATCH', '/api/v1/users/2/', {}],
    ['POST', '/api/v1/users/2/reset-password/'],
    ['POST', '/api/v1/users/2/status/', { status: 'suspended' }],
    ['PUT', '/api/v1/users/2/permissions/', { permissions: [] }],
    ['POST', '/api/v1/brands/', { name: 'Z' }],
    ['PATCH', '/api/v1/brands/1/', {}],
    ['POST', '/api/v1/items/', { name: 'N' }],
    ['PATCH', '/api/v1/items/1/', {}],
    ['POST', '/api/v1/items/1/status/', { status: 'active' }],
    ['PUT', '/api/v1/items/1/image/'],
    ['POST', '/api/v1/goods-receipts/', { supplier_name: 'S', lines: [] }],
    ['POST', '/api/v1/dispatches/', { lines: [] }],
    ['POST', '/api/v1/dispatches/1/receive/', { decision: 'approve_all' }],
  ];
  it.each(keyed)(
    '%s %s needs an Idempotency-Key (400 without, not 400 with)',
    async (m, path, body) => {
      mockSession.loggedIn = true;
      const without = await send(m, path, { 'X-CSRFToken': 't' }, body);
      expect(without.status).toBe(400);
      expect((await without.json()).errors[0].message).toMatch(/Idempotency-Key/);
      const withKey = await send(m, path, K, body);
      expect(withKey.status).toBeLessThan(400);
    },
  );

  it.each([
    ['POST', '/api/v1/auth/logout/'],
    ['POST', '/api/v1/auth/password/'],
    ['POST', '/api/v1/auth/login/'],
  ])('%s %s works without an Idempotency-Key', async (m, path) => {
    mockSession.loggedIn = true;
    const res = await send(
      m,
      path,
      { 'X-CSRFToken': 't' },
      { login_id: 'SA-0001', password: 'x', new_password: 'long-enough-1' },
    );
    expect(res.status).toBeLessThan(400);
  });

  it('base items and stock carry no cost for any role', async () => {
    mockSession.loggedIn = true;
    for (const role of ['super_admin', 'branch_admin', 'front_staff'] as const) {
      mockSession.role = role;
      const items = await (await send('GET', '/api/v1/items/')).json();
      const stock = await (await send('GET', '/api/v1/stock/')).json();
      const one = await (await send('GET', '/api/v1/items/1/')).json();
      expect(items.results.length).toBeGreaterThan(0);
      expect(stock.results.length).toBeGreaterThan(0);
      for (const row of [...items.results, ...stock.results, one]) {
        expect(row).not.toHaveProperty('average_cost');
      }
      const me = await (await send('GET', '/api/v1/auth/me/')).json();
      expect(me.active_role).toBe(role);
    }
  });

  it.each(['branch_admin', 'front_staff'] as const)(
    '%s gets 403 on every costed endpoint',
    async (role) => {
      mockSession.loggedIn = true;
      mockSession.role = role;
      for (const path of [
        '/api/v1/costed-items/',
        '/api/v1/costed-items/1/',
        '/api/v1/costed-stock/',
      ]) {
        const res = await send('GET', path);
        expect(res.status).toBe(403);
        expect(await res.json()).toMatchObject({ code: 'forbidden' });
      }
    },
  );

  it('super admin gets cost from the costed endpoints (null before the first receipt)', async () => {
    mockSession.loggedIn = true;
    const items = await (await send('GET', '/api/v1/costed-items/')).json();
    expect(items.results.map((r: { average_cost: unknown }) => r.average_cost)).toEqual([
      '900.00',
      null,
    ]);
    const one = await (await send('GET', '/api/v1/costed-items/1/')).json();
    expect(one.average_cost).toBe('900.00');
    expect((await send('GET', '/api/v1/costed-items/99/')).status).toBe(404);
    const stock = await (await send('GET', '/api/v1/costed-stock/')).json();
    expect(stock.results[0].average_cost).toBe('900.00');
  });

  it('costed endpoints are 401 when logged out', async () => {
    expect((await send('GET', '/api/v1/costed-stock/')).status).toBe(401);
  });

  it.each([
    ['branch_admin', 403],
    ['super_admin', 200],
    ['front_staff', 200],
  ] as const)('GET working-branch for %s is %i', async (role, status) => {
    mockSession.loggedIn = true;
    mockSession.role = role;
    expect((await send('GET', '/api/v1/working-branch/')).status).toBe(status);
  });

  it('item and dispatch status codes are snake_case', async () => {
    mockSession.loggedIn = true;
    const items = await (await send('GET', '/api/v1/items/')).json();
    expect(items.results.map((r: { status: string }) => r.status)).toEqual(['active', 'draft']);
    const d = await (await send('GET', '/api/v1/dispatches/1/')).json();
    expect(d.status).toBe('in_transit');
    const received = await (
      await send('POST', '/api/v1/dispatches/1/receive/', K, { decision: 'approve_partial' })
    ).json();
    expect(received.status).toBe('partially_received');
  });

  describe('brands', () => {
    it('lists active and deactivated brands', async () => {
      mockSession.loggedIn = true;
      const brands = await (await send('GET', '/api/v1/brands/')).json();
      expect(brands.map((b: { is_active: boolean }) => b.is_active)).toEqual([true, true, false]);
    });

    it('creates an active brand, and rejects blank or duplicate names with 400', async () => {
      mockSession.loggedIn = true;
      const ok = await send('POST', '/api/v1/brands/', K, { name: 'Lenovo' });
      expect(ok.status).toBe(201);
      expect(await ok.json()).toMatchObject({ name: 'Lenovo', is_active: true });
      for (const name of ['', 'hp']) {
        const bad = await send('POST', '/api/v1/brands/', K, { name });
        expect(bad.status).toBe(400);
        expect((await bad.json()).errors[0].field).toBe('name');
      }
    });

    it('renames, deactivates and reactivates; 404 for an unknown brand', async () => {
      mockSession.loggedIn = true;
      const off = await (await send('PATCH', '/api/v1/brands/1/', K, { is_active: false })).json();
      expect(off).toEqual({ id: 1, name: 'HP', is_active: false });
      const on = await (await send('PATCH', '/api/v1/brands/3/', K, { is_active: true })).json();
      expect(on).toEqual({ id: 3, name: 'Acer', is_active: true });
      const renamed = await (
        await send('PATCH', '/api/v1/brands/1/', K, { name: 'HP Inc' })
      ).json();
      expect(renamed.name).toBe('HP Inc');
      expect((await send('PATCH', '/api/v1/brands/1/', K, { name: 'Dell' })).status).toBe(400);
      expect((await send('PATCH', '/api/v1/brands/99/', K, {})).status).toBe(404);
    });

    it.each(['branch_admin', 'front_staff'] as const)(
      '%s cannot write brands (403)',
      async (role) => {
        mockSession.loggedIn = true;
        mockSession.role = role;
        expect((await send('POST', '/api/v1/brands/', K, { name: 'Q' })).status).toBe(403);
        expect((await send('PATCH', '/api/v1/brands/1/', K, {})).status).toBe(403);
      },
    );

    it('a deactivated brand cannot be chosen for a new item or an edit (400), an active one can', async () => {
      mockSession.loggedIn = true;
      for (const [m, path] of [
        ['POST', '/api/v1/items/'],
        ['PATCH', '/api/v1/items/1/'],
      ]) {
        const bad = await send(m, path, K, { brand_id: 3 });
        expect(bad.status).toBe(400);
        expect((await bad.json()).errors[0].field).toBe('brand_id');
        expect((await send(m, path, K, { brand_id: 2 })).status).toBeLessThan(400);
      }
    });
  });

  describe('user status', () => {
    it('a user created by a Super Admin starts as pending_activation', async () => {
      mockSession.loggedIn = true;
      const u = await (
        await send('POST', '/api/v1/users/', K, { full_name: 'New Person', roles: ['front_staff'] })
      ).json();
      expect(u.status).toBe('pending_activation');
      expect(u.one_time_password).toBeTruthy();
    });

    it('the status endpoint never sets pending_activation (400) and accepts the three real targets', async () => {
      mockSession.loggedIn = true;
      for (const status of ['pending_activation', 'bogus']) {
        const res = await send('POST', '/api/v1/users/2/status/', K, { status });
        expect(res.status).toBe(400);
        expect((await res.json()).errors[0].field).toBe('status');
      }
      for (const status of ['active', 'suspended', 'deactivated']) {
        const res = await send('POST', '/api/v1/users/2/status/', K, { status });
        expect((await res.json()).status).toBe(status);
      }
    });
  });

  it('login picks the session role from the login ID', async () => {
    const res = await send(
      'POST',
      '/api/v1/auth/login/',
      { 'X-CSRFToken': 't' },
      {
        login_id: 'USR-0002',
        password: 'x',
      },
    );
    expect((await res.json()).active_role).toBe('front_staff');
    expect((await send('GET', '/api/v1/costed-items/')).status).toBe(403);
  });
});
