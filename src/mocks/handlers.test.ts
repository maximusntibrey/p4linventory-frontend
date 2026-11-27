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
  // One test makes many requests with the shared key K; each is a new action, so each gets its own key.
  let seq = 0;
  const send = (
    method: string,
    path: string,
    headers: Record<string, string> = {},
    body?: unknown,
  ) =>
    fetch(new URL(path, globalThis.location.origin), {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(headers['Idempotency-Key'] === 'k-1' && { 'Idempotency-Key': 'k-' + ++seq }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  const K = { 'X-CSRFToken': 't', 'Idempotency-Key': 'k-1' };
  const validItem = {
    name: 'N',
    model_name: 'M',
    mpn: 'P',
    category_id: 1,
    subtype_id: 1,
    brand_id: 1,
    condition: 'new',
  };

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

  it('v0.1.2: /me carries home_links, can_assign_multiple_roles and must_pick_branch per role', async () => {
    mockSession.loggedIn = true;
    mockSession.role = 'super_admin';
    const sa = await (await send('GET', '/api/v1/auth/me/')).json();
    expect(sa.home_links.map((l: { label: string }) => l.label)).toEqual([
      'Activity',
      'Shortfalls',
      'Sell',
      'Find',
      'Receive',
      'Sales',
    ]);
    expect(sa).toMatchObject({ can_assign_multiple_roles: true, must_pick_branch: false });
    mockSession.role = 'branch_admin';
    const ba = await (await send('GET', '/api/v1/auth/me/')).json();
    expect(ba.home_links.map((l: { label: string }) => l.label)).toEqual([
      'Activity',
      'Shortfalls',
      'Sales',
    ]);
    expect(ba.can_assign_multiple_roles).toBe(false);
    mockSession.role = 'front_staff';
    mockSession.workingBranch = null;
    expect((await (await send('GET', '/api/v1/auth/me/')).json()).must_pick_branch).toBe(true);
  });

  it('v0.1.2: ?branch= filters branches, users and the dashboard; Front Staff gets 403 on the dashboard', async () => {
    mockSession.loggedIn = true;
    mockSession.role = 'super_admin';
    expect((await (await send('GET', '/api/v1/branches/?branch=3')).json()).results).toHaveLength(
      1,
    );
    const users = (await (await send('GET', '/api/v1/users/?branch=2')).json()).results;
    expect(users.map((u: { id: number }) => u.id)).toEqual([2]);
    expect((await (await send('GET', '/api/v1/dashboard/?branch=3')).json()).location.id).toBe(3);
    expect((await (await send('GET', '/api/v1/dashboard/')).json()).location).toBeNull();
    mockSession.role = 'front_staff';
    expect((await send('GET', '/api/v1/dashboard/')).status).toBe(403);
  });

  it('v0.1.2: a wrong-too-often current password answers 429 with Retry-After', async () => {
    mockSession.loggedIn = true;
    const res = await send(
      'POST',
      '/api/v1/auth/password/',
      { 'X-CSRFToken': 't' },
      { current_password: 'locked', new_password: 'a-long-new-password' },
    );
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('900');
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
    ['POST', '/api/v1/branches/', { code: 'X', name: 'X', branch_type: 'branch' }],
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
    ['POST', '/api/v1/items/', validItem],
    ['PATCH', '/api/v1/items/1/', {}],
    ['POST', '/api/v1/items/2/status/', { status: 'active' }],
    ['PUT', '/api/v1/items/1/image/'],
    [
      'POST',
      '/api/v1/goods-receipts/',
      { supplier_name: 'S', lines: [{ item_id: 1, quantity: 1, unit_cost: '1.00' }] },
    ],
    ['POST', '/api/v1/dispatches/', { destination_id: 2, lines: [{ item_id: 1, quantity: 1 }] }],
    ['POST', '/api/v1/dispatches/1/receive/', { decision: 'reject', reason: 'Wrong goods' }],
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
    ['warehouse_admin', 403],
    ['super_admin', 200],
    ['front_staff', 200],
  ] as const)('GET working-branch for %s is %i', async (role, status) => {
    mockSession.loggedIn = true;
    mockSession.role = role;
    expect((await send('GET', '/api/v1/working-branch/')).status).toBe(status);
  });

  it('PUT working-branch is 403 for a fixed location and is remembered for front staff', async () => {
    mockSession.loggedIn = true;
    mockSession.role = 'warehouse_admin';
    expect((await send('PUT', '/api/v1/working-branch/', K, { branch_id: 2 })).status).toBe(403);
    mockSession.role = 'front_staff';
    const res = await send('PUT', '/api/v1/working-branch/', K, { branch_id: 3 });
    expect((await res.json()).working_branch.id).toBe(3);
    const got = await (await send('GET', '/api/v1/working-branch/')).json();
    expect(got.working_branch.id).toBe(3);
  });

  it('GET users filters on q and status', async () => {
    mockSession.loggedIn = true;
    const q = await (await send('GET', '/api/v1/users/?q=kofi')).json();
    expect(q.results.map((u: { login_id: string }) => u.login_id)).toEqual(['USR-0001']);
    const s = await (await send('GET', '/api/v1/users/?status=pending_activation')).json();
    expect(s.results.map((u: { login_id: string }) => u.login_id)).toEqual(['USR-0004']);
  });

  it('item and dispatch status codes are snake_case', async () => {
    mockSession.loggedIn = true;
    const items = await (await send('GET', '/api/v1/items/')).json();
    expect(items.results.map((r: { status: string }) => r.status)).toEqual(['active', 'draft']);
    const d = await (await send('GET', '/api/v1/dispatches/1/')).json();
    expect(d.status).toBe('in_transit');
    const received = await (
      await send('POST', '/api/v1/dispatches/1/receive/', K, {
        decision: 'approve_partial',
        note: 'Short',
        lines: [
          { line_id: 1, qty_received: 1, qty_accepted: 1 },
          { line_id: 2, qty_received: 5, qty_accepted: 5 },
        ],
      })
    ).json();
    expect(received.status).toBe('partially_received');
  });

  describe('items and stock (F4)', () => {
    it('create answers 400 per missing field, 201 Draft with a new SKU, and warns on a near-duplicate', async () => {
      mockSession.loggedIn = true;
      const bad = await send('POST', '/api/v1/items/', K, { name: 'X' });
      expect(bad.status).toBe(400);
      expect((await bad.json()).errors.map((e: { field: string }) => e.field)).toEqual([
        'model_name',
        'mpn',
        'category_id',
        'subtype_id',
        'brand_id',
        'condition',
      ]);
      const made = await send('POST', '/api/v1/items/', K, validItem);
      const row = await made.json();
      expect(made.status).toBe(201);
      expect(row).toMatchObject({ id: 3, sku: 'SKU-000003', status: 'draft', warnings: [] });
      const twin = await (
        await send('POST', '/api/v1/items/', K, {
          ...validItem,
          name: 'hp 250 g9',
          model_name: '250 G9',
        })
      ).json();
      expect(twin.warnings[0]).toMatchObject({ code: 'duplicate_name_model', item_id: 1 });
      const list = await (await send('GET', '/api/v1/items/')).json();
      expect(list.count).toBe(4);
    });

    it('status moves: draft to active, active to discontinued, anything else 409', async () => {
      mockSession.loggedIn = true;
      expect((await send('POST', '/api/v1/items/1/status/', K, { status: 'active' })).status).toBe(
        409,
      );
      expect(
        (await send('POST', '/api/v1/items/2/status/', K, { status: 'discontinued' })).status,
      ).toBe(409);
      expect((await send('POST', '/api/v1/items/2/status/', K, { status: 'draft' })).status).toBe(
        400,
      );
      const on = await (
        await send('POST', '/api/v1/items/2/status/', K, { status: 'active' })
      ).json();
      expect(on.status).toBe('active');
      const off = await (
        await send('POST', '/api/v1/items/2/status/', K, { status: 'discontinued' })
      ).json();
      expect(off.status).toBe('discontinued');
    });

    it('list filters on q, status, category and brand and pages with the envelope', async () => {
      mockSession.loggedIn = true;
      const ids = async (qs: string) =>
        (await (await send('GET', `/api/v1/items/${qs}`)).json()).results.map(
          (r: { id: number }) => r.id,
        );
      expect(await ids('?q=65w')).toEqual([2]);
      expect(await ids('?status=active')).toEqual([1]);
      expect(await ids('?category_id=3')).toEqual([2]);
      expect(await ids('?brand_id=1')).toEqual([1]);
      const p2 = await (await send('GET', '/api/v1/items/?page_size=1&page=2')).json();
      expect(p2).toMatchObject({ count: 2, page: 2, next: null, previous: '?page=1' });
      expect(p2.results.map((r: { id: number }) => r.id)).toEqual([2]);
    });

    it('field definitions follow the category', async () => {
      mockSession.loggedIn = true;
      const keys = async (c: number) =>
        (await (await send('GET', `/api/v1/item-field-definitions/?category_id=${c}`)).json()).map(
          (f: { key: string }) => f.key,
        );
      expect(await keys(1)).toContain('ram_gb');
      expect(await keys(3)).toContain('wattage');
      expect(await keys(3)).not.toContain('ram_gb');
    });

    it('stock: Branch Admin and Front Staff see only their branch; another location is 403', async () => {
      mockSession.loggedIn = true;
      mockSession.role = 'branch_admin';
      const own = await (await send('GET', '/api/v1/stock/')).json();
      expect(new Set(own.results.map((r: { location_id: number }) => r.location_id))).toEqual(
        new Set([2]),
      );
      expect((await send('GET', '/api/v1/stock/?location_id=3')).status).toBe(403);
      expect((await send('GET', '/api/v1/stock/?location_id=2')).status).toBe(200);
      mockSession.role = 'super_admin';
      const all = await (await send('GET', '/api/v1/stock/')).json();
      expect(all.count).toBe(3);
      expect((await (await send('GET', '/api/v1/stock/?q=nothing')).json()).count).toBe(0);
    });
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
        const bad = await send(m, path, K, { ...validItem, brand_id: 3 });
        expect(bad.status).toBe(400);
        expect((await bad.json()).errors[0].field).toBe('brand_id');
        expect((await send(m, path, K, { ...validItem, brand_id: 2 })).status).toBeLessThan(400);
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

describe('FIX-30 selling_price needs prices.manage (403 permission_denied)', () => {
  const body = {
    name: 'N',
    model_name: 'M',
    mpn: 'P',
    category_id: 1,
    subtype_id: 1,
    brand_id: 1,
    condition: 'new',
    selling_price: '10.00',
  };
  let calls = 0;
  const call = (m: string, path: string, b: object) =>
    fetch(new URL(path, globalThis.location.origin), {
      method: m,
      headers: {
        'X-CSRFToken': 't',
        'Idempotency-Key': 'p-' + ++calls,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(b),
    });
  it('POST and PATCH with a price are 403 without the permission, fine with it or without a price', async () => {
    mockSession.loggedIn = true;
    mockSession.role = 'branch_admin';
    const noPrice = { ...body, selling_price: undefined };
    for (const [m, p] of [
      ['POST', '/api/v1/items/'],
      ['PATCH', '/api/v1/items/1/'],
    ]) {
      const res = await call(m, p, body);
      expect(res.status).toBe(403);
      expect((await res.json()).code).toBe('permission_denied');
      expect((await call(m, p, noPrice)).status).toBeLessThan(400);
    }
    mockSession.role = 'super_admin';
    expect((await call('POST', '/api/v1/items/', body)).status).toBe(201);
  });
});

describe('branch type and audit log mocks (contract 0.6.0)', () => {
  let n = 0;
  const api = (method: string, path: string, body?: object) =>
    fetch(new URL(path, globalThis.location.origin), {
      method,
      headers: {
        'X-CSRFToken': 't',
        'Idempotency-Key': 'bt-' + ++n,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const signIn = (role: typeof mockSession.role = 'super_admin') => {
    mockSession.loggedIn = true;
    mockSession.role = role;
  };

  it('lists branch_type and filters on it', async () => {
    signIn();
    const all = await (await api('GET', '/api/v1/branches/')).json();
    expect(
      all.results.every((b: { branch_type: string; kind: string }) => b.branch_type === b.kind),
    ).toBe(true);
    const wh = await (await api('GET', '/api/v1/branches/?branch_type=warehouse')).json();
    expect(wh.results.map((b: { code: string }) => b.code)).toEqual(['WH']);
  });

  it('creates a branch of either type; branch_type is required (400 when missing or unknown)', async () => {
    signIn();
    const made = await api('POST', '/api/v1/branches/', {
      code: 'TMA',
      name: 'Tema',
      branch_type: 'branch',
    });
    expect(made.status).toBe(201);
    expect((await made.json()).branch_type).toBe('branch');
    const second = await api('POST', '/api/v1/branches/', {
      code: 'W2',
      name: 'Second',
      branch_type: 'warehouse',
    });
    expect(second.status).toBe(201);
    expect((await second.json()).kind).toBe('warehouse');
    for (const body of [
      { code: 'X', name: 'X' },
      { code: 'X', name: 'X', branch_type: 'shop' },
    ]) {
      const bad = await api('POST', '/api/v1/branches/', body);
      expect(bad.status).toBe(400);
      expect((await bad.json()).errors[0].field).toBe('branch_type');
    }
  });

  it('edit: a branch may become a warehouse; a used warehouse cannot become a branch', async () => {
    signIn();
    expect((await api('PATCH', '/api/v1/branches/2/', { branch_type: 'warehouse' })).status).toBe(
      200,
    );
    // Branch 2 holds stock now, so it is "in use" like warehouse 1.
    expect((await api('PATCH', '/api/v1/branches/2/', { branch_type: 'branch' })).status).toBe(400);
    expect((await api('PATCH', '/api/v1/branches/1/', { branch_type: 'branch' })).status).toBe(400);
    expect((await api('PATCH', '/api/v1/branches/1/', { branch_type: 'warehouse' })).status).toBe(
      200,
    );
    expect((await api('PATCH', '/api/v1/branches/1/', { branch_type: 'x' })).status).toBe(400);
  });

  it('activity log: search, target_type, ordering and paging', async () => {
    signIn();
    const get = async (q: string) => (await api('GET', `/api/v1/activity-log/${q}`)).json();
    const first = await get('?page_size=2');
    expect(first.count).toBe(6);
    expect(first.results).toHaveLength(2);
    expect(first.next).not.toBeNull();
    expect((await get('?search=trf-000001')).count).toBe(1);
    expect((await get('?target_type=sale')).count).toBe(1);
    const asc = await get('?ordering=action');
    expect(asc.results[0].action).toBe('dispatch_created');
    expect((await api('GET', '/api/v1/activity-log/?ordering=bogus')).status).toBe(400);
  });

  it('activity export is CSV, honours filters, is scoped, and is 403 for Front Staff', async () => {
    signIn();
    const res = await api('GET', '/api/v1/activity-log/export/?target_type=dispatch');
    expect(res.headers.get('Content-Type')).toContain('text/csv');
    expect(res.headers.get('X-Export-Truncated')).toBe('false');
    const lines = (await res.text()).split('\n');
    expect(lines[0]).toMatch(/^occurred_at,user_login_id/);
    expect(lines).toHaveLength(4);
    signIn('front_staff');
    expect((await api('GET', '/api/v1/activity-log/export/')).status).toBe(403);
  });
});
