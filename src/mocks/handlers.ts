import { http, HttpResponse, type RequestHandler } from 'msw';
import type { components } from '../api/schema';
import * as d from './data';

type S = components['schemas'];

/** Mock login state. Starts logged out so the login screen can be built against it. Tests set or reset it. */
export const mockSession: {
  loggedIn: boolean;
  role: d.MockRole;
  /** Login ID of the signed-in mock user; unset means the role's default user. */
  loginId?: string;
  /** One-time password not changed yet (USR-0004): every endpoint but me, password, logout and csrf gives 403. */
  mustChange: boolean;
  /** Branch chosen with PUT working-branch; undefined means the role's default, null means none chosen yet. */
  workingBranch?: S['Branch'] | null;
} = {
  loggedIn: false,
  role: 'super_admin',
  mustChange: false,
};
const me = (): S['Me'] => {
  const base = {
    ...d.meByRole[mockSession.role],
    ...(mockSession.workingBranch !== undefined && { working_branch: mockSession.workingBranch }),
  } satisfies S['Me'];
  const user = d.users.find((u) => u.login_id === mockSession.loginId) ?? base.user;
  // v0.1.2: true only for Front Staff with no branch yet; never for the Super Admin.
  const mustPick = mockSession.role === 'front_staff' && base.working_branch === null;
  const must = mockSession.mustChange;
  return {
    ...base,
    must_pick_branch: mustPick,
    must_change_password: must,
    user: {
      ...user,
      must_change_password: must,
      status: must
        ? 'pending_activation'
        : user.status === 'pending_activation'
          ? 'active'
          : user.status,
    },
  };
};
const text = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
const flag = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

const err = (
  status: number,
  code: string,
  message: string,
  errors: S['Error']['errors'] = [],
  headers?: HeadersInit,
) => HttpResponse.json({ code, message, errors } satisfies S['Error'], { status, headers });
const invalid = (errors: S['Error']['errors']) =>
  err(400, 'validation_error', 'Check the highlighted fields.', errors);
const unauthorized = () => err(401, 'not_authenticated', 'Log in to continue.');
const forbidden = () => err(403, 'forbidden', 'You cannot do this.');
const notFound = () => err(404, 'not_found', 'No such record.');
const page = <T>(results: T[]) =>
  HttpResponse.json({
    count: results.length,
    page: 1,
    page_size: 25,
    next: null,
    previous: null,
    results,
  });
/** A page of `rows` honouring `page` and `page_size` (default 25), with the contract's envelope. */
const paged = <T>(request: Request, rows: T[]) => {
  const p = new URL(request.url).searchParams;
  const size = Math.min(Math.max(Number(p.get('page_size')) || 25, 1), 100);
  const n = Math.max(Number(p.get('page')) || 1, 1);
  return HttpResponse.json({
    count: rows.length,
    page: n,
    page_size: size,
    next: n * size < rows.length ? `?page=${n + 1}` : null,
    previous: n > 1 ? `?page=${n - 1}` : null,
    results: rows.slice((n - 1) * size, n * size),
  });
};
const byId = <T extends { id: number }>(rows: T[], id: unknown) =>
  rows.find((r) => r.id === Number(id));

/** Items made or changed during this mock session. Tests reset it after each test. */
export const mockStore = { items: structuredClone(d.costedItems) };
export const resetMockStore = () => {
  mockStore.items = structuredClone(d.costedItems);
};
const withoutCost = (row: S['ItemWithCost']) =>
  Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'average_cost')) as S['Item'];
const matchItems = (rows: S['ItemWithCost'][], request: Request) => {
  const p = new URL(request.url).searchParams;
  const q = (p.get('q') ?? '').toLowerCase();
  return rows.filter(
    (r) =>
      (!q ||
        [r.name, r.sku, r.brand_name, r.model_name, r.mpn].some((v) =>
          (v ?? '').toLowerCase().includes(q),
        )) &&
      (!p.get('status') || r.status === p.get('status')) &&
      (!p.get('condition') || r.condition === p.get('condition')) &&
      (!p.get('category_id') || r.category_id === Number(p.get('category_id'))) &&
      (!p.get('brand_id') || r.brand_id === Number(p.get('brand_id'))),
  );
};
const conditions = ['new', 'refurbished', 'used'] as const;
const grades = ['A', 'B', 'C'] as const;
const num = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback);
/** The only item fields a create or update may change; anything else in the body is dropped. */
const applyItem = (b: Record<string, unknown>, row: S['ItemWithCost']): S['ItemWithCost'] => {
  const brand_id = num(b.brand_id, row.brand_id);
  return {
    ...row,
    name: text(b.name, row.name),
    category_id: num(b.category_id, row.category_id),
    subtype_id: num(b.subtype_id, row.subtype_id),
    brand_id,
    brand_name: d.brands.find((x) => x.id === brand_id)?.name ?? row.brand_name,
    model_name: text(b.model_name, row.model_name),
    mpn: text(b.mpn, row.mpn),
    description: text(b.description, row.description ?? ''),
    search_keywords: text(b.search_keywords, row.search_keywords ?? ''),
    show_on_website: flag(b.show_on_website, row.show_on_website),
    condition: conditions.find((c) => c === b.condition) ?? row.condition,
    grade: b.grade === null ? null : (grades.find((g) => g === b.grade) ?? row.grade),
    key_specs:
      typeof b.key_specs === 'object' && b.key_specs !== null && !Array.isArray(b.key_specs)
        ? (b.key_specs as Record<string, unknown>)
        : row.key_specs,
    selling_price: typeof b.selling_price === 'string' ? b.selling_price : row.selling_price,
    updated_at: d.t,
  };
};
const saveItem = (row: S['ItemWithCost']) => {
  const i = mockStore.items.findIndex((x) => x.id === row.id);
  if (i >= 0) mockStore.items[i] = row;
  else mockStore.items.push(row);
  return row;
};
const readJson = async (request: Request) => (await request.json()) as Record<string, unknown>;

type Resolver = Parameters<typeof http.get>[1];
/** Unsafe requests need the CSRF header, like the real server (403 csrf_failed). Checked before login state. */
const csrf =
  (fn: Resolver): Resolver =>
  (info) =>
    info.request.headers.get('X-CSRFToken')
      ? fn(info)
      : err(403, 'csrf_failed', 'CSRF token missing or incorrect.');
const post = (path: string, fn: Resolver) => http.post(path, csrf(fn));
const put = (path: string, fn: Resolver) => http.put(path, csrf(fn));
const patch = (path: string, fn: Resolver) => http.patch(path, csrf(fn));
/** Me, password change and logout only need a session (they work before the forced password change). */
const loggedIn =
  (fn: Resolver): Resolver =>
  (info) =>
    mockSession.loggedIn ? fn(info) : unauthorized();
/** Every other logged-in endpoint also answers 403 password_change_required until the one-time password is changed. */
const authed = (fn: Resolver): Resolver =>
  loggedIn((info) =>
    mockSession.mustChange
      ? err(403, 'password_change_required', 'Change your password to continue.')
      : fn(info),
  );
/** The contract requires an Idempotency-Key on these POSTs. */
const keyed =
  (fn: Resolver): Resolver =>
  (info) =>
    info.request.headers.get('Idempotency-Key')
      ? fn(info)
      : invalid([{ field: null, message: 'Idempotency-Key header is required.' }]);
/** State-changing operations: logged in, then the Idempotency-Key check. */
const writeAuthed = (fn: Resolver): Resolver => authed(keyed(fn));
/** Only Super Admin or a Manage prices holder may send selling_price (403 permission_denied). */
const priceDenied = (b: Record<string, unknown>) =>
  b.selling_price !== undefined && !me().permissions.includes('prices.manage')
    ? err(403, 'permission_denied', 'You may not set prices.')
    : undefined;
/** Cost endpoints are for SA/WA; the mock's Branch Admin and Front Staff sessions get 403. */
const costed =
  (fn: Resolver): Resolver =>
  (info) =>
    mockSession.role === 'branch_admin' || mockSession.role === 'front_staff'
      ? forbidden()
      : fn(info);
/** BA and WA have a fixed location and cannot choose a working branch (403). */
const fixedLocation = () =>
  mockSession.role === 'branch_admin' || mockSession.role === 'warehouse_admin';
const inactiveBrand = (id: unknown) => d.brands.some((x) => x.id === id && !x.is_active);
const brandInactive = () =>
  invalid([{ field: 'brand_id', message: 'This brand is deactivated. Pick an active brand.' }]);
const one = <T extends { id: number }>(rows: T[], view: (row: T) => object = (r) => r): Resolver =>
  authed(({ params }) => {
    const row = byId(rows, params.id);
    return row ? HttpResponse.json(view(row)) : notFound();
  });

export const handlers: RequestHandler[] = [
  http.get('/health/', () => HttpResponse.json({ status: 'ok', database: 'ok' })),

  http.get('/api/v1/auth/csrf/', () => HttpResponse.json({ csrf_token: 'mock-csrf-token' })),
  post('/api/v1/auth/login/', async ({ request }) => {
    const b = await readJson(request);
    if (!b.login_id || !b.password) {
      return invalid([
        ...(b.login_id ? [] : [{ field: 'login_id', message: 'This field is required.' }]),
        ...(b.password ? [] : [{ field: 'password', message: 'This field is required.' }]),
      ]);
    }
    if (b.password === 'wrong') {
      return err(401, 'invalid_credentials', 'Login ID or password is not right.');
    }
    if (b.password === 'locked') {
      return err(429, 'rate_limited', 'Too many failed attempts.', [], { 'Retry-After': '900' });
    }
    mockSession.loggedIn = true;
    mockSession.role = d.roleOfLogin(b.login_id);
    mockSession.loginId = typeof b.login_id === 'string' ? b.login_id : undefined;
    mockSession.mustChange = d.users.some(
      (u) => u.login_id === b.login_id && u.must_change_password,
    );
    return HttpResponse.json(me());
  }),
  post(
    '/api/v1/auth/logout/',
    loggedIn(() => {
      mockSession.loggedIn = false;
      mockSession.mustChange = false;
      return new HttpResponse(null, { status: 204 });
    }),
  ),
  http.get(
    '/api/v1/auth/me/',
    loggedIn(() => HttpResponse.json(me())),
  ),
  post(
    '/api/v1/auth/password/',
    loggedIn(async ({ request }) => {
      const b = await readJson(request);
      if (b.current_password === 'locked') {
        return err(429, 'rate_limited', 'Too many wrong passwords.', [], { 'Retry-After': '900' });
      }
      if (b.current_password === 'wrong') {
        return invalid([
          { field: 'current_password', message: 'Your current password is not right.' },
        ]);
      }
      if (typeof b.new_password !== 'string' || b.new_password.length < 10) {
        return invalid([{ field: 'new_password', message: 'Use at least 10 characters.' }]);
      }
      if (b.new_password === b.current_password) {
        return invalid([
          { field: 'new_password', message: 'Choose a password you have not used.' },
        ]);
      }
      mockSession.mustChange = false;
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  http.get(
    '/api/v1/working-branch/',
    authed(() =>
      fixedLocation() ? forbidden() : HttpResponse.json({ working_branch: me().working_branch }),
    ),
  ),
  put(
    '/api/v1/working-branch/',
    writeAuthed(async ({ request }) => {
      if (fixedLocation()) return forbidden();
      const branch = byId(d.branches, (await readJson(request)).branch_id);
      if (!branch)
        return invalid([{ field: 'branch_id', message: 'Pick one of the listed branches.' }]);
      mockSession.workingBranch = branch;
      return HttpResponse.json(me());
    }),
  ),

  http.get(
    '/api/v1/branches/',
    authed(({ request }) => {
      const params = new URL(request.url).searchParams;
      const only = params.get('branch');
      const kind = params.get('kind');
      const active = params.get('is_active');
      return page(
        d.branches.filter(
          (b) =>
            (!kind || b.kind === kind) &&
            (!active || String(b.is_active) === active) &&
            (!only || b.id === Number(only)),
        ),
      );
    }),
  ),
  post(
    '/api/v1/branches/',
    writeAuthed(async ({ request }) => {
      const b = await readJson(request);
      return HttpResponse.json(
        {
          id: 4,
          kind: 'branch',
          code: text(b.code, ''),
          name: text(b.name, ''),
          is_active: true,
          created_at: d.t,
          updated_at: d.t,
        } satisfies S['Branch'],
        { status: 201 },
      );
    }),
  ),
  http.get('/api/v1/branches/:id/', one(d.branches)),
  patch(
    '/api/v1/branches/:id/',
    writeAuthed(async ({ params, request }) => {
      const row = byId(d.branches, params.id);
      if (!row) return notFound();
      const b = await readJson(request);
      return HttpResponse.json({
        ...row,
        code: text(b.code, row.code),
        name: text(b.name, row.name),
      } satisfies S['Branch']);
    }),
  ),
  post(
    '/api/v1/branches/:id/deactivate/',
    writeAuthed(({ params }) => {
      const row = byId(d.branches, params.id);
      if (!row) return notFound();
      if (row.kind === 'warehouse') {
        return err(409, 'invalid_status_transition', 'The warehouse cannot be deactivated.');
      }
      return HttpResponse.json({ ...row, is_active: false });
    }),
  ),
  post(
    '/api/v1/branches/:id/activate/',
    writeAuthed(({ params }) => {
      const row = byId(d.branches, params.id);
      return row ? HttpResponse.json({ ...row, is_active: true }) : notFound();
    }),
  ),

  http.get(
    '/api/v1/users/',
    authed(({ request }) => {
      const url = new URL(request.url);
      const q = (url.searchParams.get('q') ?? '').toLowerCase();
      const status = url.searchParams.get('status');
      const only = url.searchParams.get('branch');
      return page(
        d.users.filter(
          (u) =>
            (!only || u.permanent_location_id === Number(only)) &&
            (!q || u.login_id.toLowerCase().includes(q) || u.full_name.toLowerCase().includes(q)) &&
            (!status || u.status === status),
        ),
      );
    }),
  ),
  post(
    '/api/v1/users/',
    writeAuthed(async ({ request }) => {
      const b = await readJson(request);
      return HttpResponse.json(
        {
          ...d.users[1],
          id: 6,
          login_id: 'USR-0005',
          status: 'pending_activation',
          full_name: String(b.full_name),
          roles: b.roles as S['RoleCode'][],
          must_change_password: true,
          permissions: [],
          one_time_password: 'Mock-OTP-7421',
          one_time_password_expires_at: '2026-11-26T14:05:00Z',
        } satisfies S['UserWithOneTimePassword'],
        { status: 201 },
      );
    }),
  ),
  http.get('/api/v1/users/:id/', one(d.users)),
  patch(
    '/api/v1/users/:id/',
    writeAuthed(async ({ params, request }) => {
      const row = byId(d.users, params.id);
      if (!row) return notFound();
      const b = await readJson(request);
      return HttpResponse.json({
        ...row,
        full_name: text(b.full_name, row.full_name),
        roles: Array.isArray(b.roles) ? (b.roles as S['RoleCode'][]) : row.roles,
        permanent_location_id:
          typeof b.permanent_location_id === 'number' || b.permanent_location_id === null
            ? b.permanent_location_id
            : row.permanent_location_id,
      } satisfies S['User']);
    }),
  ),
  post(
    '/api/v1/users/:id/reset-password/',
    writeAuthed(({ params }) =>
      byId(d.users, params.id)
        ? HttpResponse.json({
            one_time_password: 'Mock-OTP-1138',
            one_time_password_expires_at: '2026-11-26T14:05:00Z',
          })
        : notFound(),
    ),
  ),
  post(
    '/api/v1/users/:id/status/',
    writeAuthed(async ({ params, request }) => {
      const row = byId(d.users, params.id);
      if (!row) return notFound();
      if (row.id === d.users[0].id) {
        return err(409, 'invalid_status_transition', 'You cannot change your own status.');
      }
      const b = await readJson(request);
      // pending_activation is never a target here: it ends with the first password change (400).
      if (b.status !== 'active' && b.status !== 'suspended' && b.status !== 'deactivated') {
        return invalid([{ field: 'status', message: 'Pick active, suspended or deactivated.' }]);
      }
      return HttpResponse.json({ ...row, status: b.status } satisfies S['User']);
    }),
  ),
  http.get(
    '/api/v1/users/:id/permissions/',
    authed(({ params }) => {
      const row = byId(d.users, params.id);
      return row ? HttpResponse.json({ permissions: row.permissions }) : notFound();
    }),
  ),
  put(
    '/api/v1/users/:id/permissions/',
    writeAuthed(async ({ params, request }) => {
      const row = byId(d.users, params.id);
      if (!row) return notFound();
      const b = await readJson(request);
      return HttpResponse.json({
        permissions: Array.isArray(b.permissions)
          ? (b.permissions as S['PersonPermission'][])
          : row.permissions,
      } satisfies S['UserPermissions']);
    }),
  ),

  http.get(
    '/api/v1/dashboard/',
    authed(({ request }) => {
      if (!me().permissions.includes('dashboard.view')) return forbidden();
      const only = d.byBranch(new URL(request.url).searchParams.get('branch'));
      return HttpResponse.json({
        ...d.dashboard,
        role: me().active_role,
        ...(mockSession.role === 'super_admin' && { location: only ?? null }),
        ...(mockSession.role === 'super_admin' ? {} : { stock_per_location: undefined }),
      } satisfies S['Dashboard']);
    }),
  ),

  http.get(
    '/api/v1/item-categories/',
    authed(() => HttpResponse.json(d.categories)),
  ),
  http.get(
    '/api/v1/brands/',
    authed(() => HttpResponse.json(d.brands)),
  ),
  post(
    '/api/v1/brands/',
    writeAuthed(
      costed(async ({ request }) => {
        const b = await readJson(request);
        const name = text(b.name, '').trim();
        if (!name) return invalid([{ field: 'name', message: 'This field is required.' }]);
        if (d.brands.some((x) => x.name.toLowerCase() === name.toLowerCase())) {
          return invalid([{ field: 'name', message: 'A brand with this name exists.' }]);
        }
        return HttpResponse.json({ id: 4, name, is_active: true } satisfies S['Brand'], {
          status: 201,
        });
      }),
    ),
  ),
  patch(
    '/api/v1/brands/:id/',
    writeAuthed(
      costed(async ({ params, request }) => {
        const row = byId(d.brands, params.id);
        if (!row) return notFound();
        const b = await readJson(request);
        const name = text(b.name, row.name).trim();
        if (!name) return invalid([{ field: 'name', message: 'This field is required.' }]);
        if (d.brands.some((x) => x.id !== row.id && x.name.toLowerCase() === name.toLowerCase())) {
          return invalid([{ field: 'name', message: 'A brand with this name exists.' }]);
        }
        return HttpResponse.json({
          id: row.id,
          name,
          is_active: flag(b.is_active, row.is_active),
        } satisfies S['Brand']);
      }),
    ),
  ),
  http.get(
    '/api/v1/item-field-definitions/',
    authed(({ request }) =>
      new URL(request.url).searchParams.get('category_id')
        ? HttpResponse.json(
            d.fieldDefinitionsFor(Number(new URL(request.url).searchParams.get('category_id'))),
          )
        : invalid([{ field: 'category_id', message: 'This field is required.' }]),
    ),
  ),
  http.get(
    '/api/v1/items/',
    authed(({ request }) => paged(request, matchItems(mockStore.items, request).map(withoutCost))),
  ),
  http.get(
    '/api/v1/costed-items/',
    authed(costed(({ request }) => paged(request, matchItems(mockStore.items, request)))),
  ),
  http.get(
    '/api/v1/costed-items/:id/',
    authed(
      costed(({ params }) => {
        const row = byId(mockStore.items, params.id);
        return row ? HttpResponse.json(row) : notFound();
      }),
    ),
  ),
  post(
    '/api/v1/items/',
    writeAuthed(async ({ request }) => {
      const b = await readJson(request);
      const denied = priceDenied(b);
      if (denied) return denied;
      if (inactiveBrand(b.brand_id)) return brandInactive();
      const missing = ['name', 'model_name', 'mpn'].filter((k) => !text(b[k], '').trim());
      const errors = [
        ...missing.map((field) => ({ field, message: 'This field is required.' })),
        ...['category_id', 'subtype_id', 'brand_id']
          .filter((k) => typeof b[k] !== 'number')
          .map((field) => ({ field, message: 'This field is required.' })),
        ...(conditions.some((c) => c === b.condition)
          ? []
          : [{ field: 'condition', message: 'Pick new, refurbished or used.' }]),
      ];
      if (errors.length) return invalid(errors);
      const id = Math.max(0, ...mockStore.items.map((i) => i.id)) + 1;
      const row = applyItem(b, {
        ...d.costedItems[1],
        id,
        sku: `SKU-${String(id).padStart(6, '0')}`,
        status: 'draft',
        image_url: null,
        selling_price: null,
        average_cost: null,
        created_at: d.t,
      });
      const twin = mockStore.items.find(
        (i) =>
          i.name.toLowerCase() === row.name.toLowerCase() &&
          i.model_name.toLowerCase() === row.model_name.toLowerCase(),
      );
      saveItem(row);
      return HttpResponse.json(
        {
          ...row,
          warnings: twin
            ? [
                {
                  code: 'duplicate_name_model',
                  message: `Looks the same as ${twin.sku} (${twin.name}).`,
                  item_id: twin.id,
                },
              ]
            : [],
        } satisfies S['ItemWithCostAndWarnings'],
        { status: 201 },
      );
    }),
  ),
  http.get(
    '/api/v1/items/:id/',
    authed(({ params }) => {
      const row = byId(mockStore.items, params.id);
      return row ? HttpResponse.json(withoutCost(row)) : notFound();
    }),
  ),
  patch(
    '/api/v1/items/:id/',
    writeAuthed(async ({ params, request }) => {
      const row = byId(mockStore.items, params.id);
      if (!row) return notFound();
      const b = await readJson(request);
      const denied = priceDenied(b);
      if (denied) return denied;
      if (inactiveBrand(b.brand_id)) return brandInactive();
      return HttpResponse.json({
        ...saveItem(applyItem(b, row)),
        warnings: [],
      } satisfies S['ItemWithCostAndWarnings']);
    }),
  ),
  post(
    '/api/v1/items/:id/status/',
    writeAuthed(async ({ params, request }) => {
      const row = byId(mockStore.items, params.id);
      if (!row) return notFound();
      const to = (await readJson(request)).status;
      if (to !== 'active' && to !== 'discontinued') {
        return invalid([{ field: 'status', message: 'Pick active or discontinued.' }]);
      }
      const allowed =
        (row.status === 'draft' && to === 'active') ||
        (row.status === 'active' && to === 'discontinued');
      if (!allowed) {
        return err(409, 'invalid_status_transition', 'This item cannot move to that status.');
      }
      return HttpResponse.json(saveItem({ ...row, status: to }) satisfies S['ItemWithCost']);
    }),
  ),
  put(
    '/api/v1/items/:id/image/',
    writeAuthed(({ params }) => {
      const row = byId(mockStore.items, params.id);
      if (!row) return notFound();
      // The mock does not read the file (a multipart body cannot be read in the jsdom test setup). The
      // real server's 400 and 413 answers are covered with per-test overrides.
      return HttpResponse.json(
        saveItem({ ...row, image_url: '/media/items/mock.png' }) satisfies S['ItemWithCost'],
      );
    }),
  ),
  http.get(
    '/api/v1/items/:id/branch-availability/',
    authed(({ params }) =>
      byId(mockStore.items, params.id) ? HttpResponse.json(d.availability) : notFound(),
    ),
  ),

  http.get(
    '/api/v1/stock/',
    authed(({ request }) => {
      const p = new URL(request.url).searchParams;
      const q = (p.get('q') ?? '').toLowerCase();
      const location = p.get('location_id');
      // Branch Admin and Front Staff see only their own branch; asking for another one is 403.
      const own =
        mockSession.role === 'branch_admin' || mockSession.role === 'front_staff'
          ? (me().working_branch?.id ?? 0)
          : undefined;
      if (own !== undefined && location && Number(location) !== own) return forbidden();
      return paged(
        request,
        d.stock.filter(
          (r) =>
            (own === undefined || r.location_id === own) &&
            (!location || r.location_id === Number(location)) &&
            (!q || r.item_name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)),
        ),
      );
    }),
  ),
  http.get(
    '/api/v1/stock/movements/',
    authed(({ request }) => {
      const p = new URL(request.url).searchParams;
      const location = p.get('location_id');
      const own =
        mockSession.role === 'branch_admin' || mockSession.role === 'front_staff'
          ? (me().working_branch?.id ?? 0)
          : undefined;
      if (own !== undefined && location && Number(location) !== own) return forbidden();
      return paged(
        request,
        d.stockMovements.filter(
          (r) =>
            (own === undefined || r.location_id === own) &&
            (!location || r.location_id === Number(location)) &&
            (!p.get('movement_type') || r.movement_type === p.get('movement_type')),
        ),
      );
    }),
  ),
  http.get('/api/v1/costed-stock/', authed(costed(() => page(d.costedStock)))),

  http.get(
    '/api/v1/goods-receipts/',
    authed(() => page([d.goodsReceipt])),
  ),
  post(
    '/api/v1/goods-receipts/',
    writeAuthed(async ({ request }) => {
      const b = await readJson(request);
      return HttpResponse.json(
        {
          ...d.goodsReceipt,
          supplier_name: text(b.supplier_name, ''),
        } satisfies S['GoodsReceipt'],
        { status: 201 },
      );
    }),
  ),
  http.get('/api/v1/goods-receipts/:id/', one([d.goodsReceipt])),

  http.get(
    '/api/v1/dispatches/',
    authed(() => page([d.dispatch])),
  ),
  post(
    '/api/v1/dispatches/',
    writeAuthed(() => HttpResponse.json(d.dispatch, { status: 201 })),
  ),
  http.get(
    '/api/v1/dispatches/waiting/',
    authed(() => page([d.dispatch])),
  ),
  http.get('/api/v1/dispatches/:id/', one([d.dispatch])),
  post(
    '/api/v1/dispatches/:id/receive/',
    writeAuthed(async ({ params, request }) => {
      if (!byId([d.dispatch], params.id)) return notFound();
      const b = await readJson(request);
      const status: S['DispatchStatus'] =
        b.decision === 'reject'
          ? 'rejected'
          : b.decision === 'approve_partial'
            ? 'partially_received'
            : 'completed';
      return HttpResponse.json({ ...d.dispatch, status });
    }),
  ),
];
