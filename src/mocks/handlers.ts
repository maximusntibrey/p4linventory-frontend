import { http, HttpResponse, type RequestHandler } from 'msw';
import type { components } from '../api/schema';
import { checkCsv, parseCsv } from './csvReport';
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
/** A reader without `items.view_cost` (the central warehouse role) gets receipt lines without the cost. */
const receiptFor = (r: S['GoodsReceipt']): S['GoodsReceipt'] =>
  me().permissions.includes('items.view_cost')
    ? r
    : {
        ...r,
        lines: r.lines.map((l) => {
          const line = { ...l };
          delete line.unit_cost;
          return line;
        }),
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
/** Contract 0.7.0: the type is required on create (`optional` on edit); an unknown type is 400. */
const branchTypeError = (sent: unknown, optional: boolean) =>
  (sent === undefined && optional) || sent === 'branch' || sent === 'warehouse'
    ? null
    : invalid([{ field: 'branch_type', message: 'Choose Normal Branch or Warehouse.' }]);
const byId = <T extends { id: number }>(rows: T[], id: unknown) =>
  rows.find((r) => r.id === Number(id));

/** Contract 0.7.0 warehouse_id on goods receipts and dispatches: default, 400 and 403 wrong_branch. */
const resolveWarehouse = (sent: unknown): S['Branch'] | Response => {
  const active = mockStore.branches.filter((x) => x.kind === 'warehouse' && x.is_active);
  let w: S['Branch'] | undefined;
  if (sent === undefined || sent === null) {
    if (active.length !== 1)
      return invalid([{ field: 'warehouse_id', message: 'Choose a warehouse.' }]);
    w = active[0];
  } else {
    w = active.find((x) => x.id === sent);
    if (!w) return invalid([{ field: 'warehouse_id', message: 'Choose an active warehouse.' }]);
  }
  if (mockSession.role === 'warehouse_admin' && w.id !== me().working_branch?.id)
    return err(403, 'wrong_branch', 'You can only work in your own warehouse.');
  return w;
};

/** Items made or changed during this mock session. Tests reset it after each test. */
export const mockStore = {
  items: structuredClone(d.costedItems),
  stock: structuredClone(d.stock),
  dispatches: structuredClone(d.dispatches),
  receipts: [structuredClone(d.goodsReceipt)],
  sales: structuredClone(d.sales),
  activity: structuredClone(d.activityEvents),
  branches: structuredClone(d.branches),
  /** Resolutions per dispatch line id (the shortfall id). */
  resolutions: {} as Record<number, S['Shortfall']['resolutions']>,
  resolutionCount: 0,
  imports: 0,
};
export const resetMockStore = () => {
  replays.clear();
  mockStore.items = structuredClone(d.costedItems);
  mockStore.stock = structuredClone(d.stock);
  mockStore.dispatches = structuredClone(d.dispatches);
  mockStore.receipts = [structuredClone(d.goodsReceipt)];
  mockStore.sales = structuredClone(d.sales);
  mockStore.activity = structuredClone(d.activityEvents);
  // In place: the by-id handler keeps this array reference.
  mockStore.branches.splice(0, mockStore.branches.length, ...structuredClone(d.branches));
  mockStore.resolutions = {};
  mockStore.resolutionCount = 0;
  mockStore.imports = 0;
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
    subtype_id: typeof b.subtype_id === 'number' ? b.subtype_id : row.subtype_id,
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
/** Answers kept per key and path, so a replay returns the first answer (contract v0.1.1). Cleared with the mock store. */
const replays = new Map<string, { body: string; status: number; answer: string }>();
/** The contract requires an Idempotency-Key on these POSTs; the same key and body replays, another body is 409. */
const keyed =
  (fn: Resolver): Resolver =>
  async (info) => {
    const key = info.request.headers.get('Idempotency-Key');
    if (!key) return invalid([{ field: null, message: 'Idempotency-Key header is required.' }]);
    const id = key + ' ' + new URL(info.request.url).pathname;
    // Only JSON bodies are compared; an upload is replayed by key alone.
    const body = info.request.headers.get('Content-Type')?.includes('json')
      ? await info.request.clone().text()
      : '';
    const seen = replays.get(id);
    if (seen) {
      return seen.body === body
        ? new Response(seen.answer || null, {
            status: seen.status,
            headers: { 'Content-Type': 'application/json' },
          })
        : err(409, 'idempotency_conflict', 'This key was already used for a different request.');
    }
    const res = (await fn(info)) as Response;
    if (res.ok) replays.set(id, { body, status: res.status, answer: await res.clone().text() });
    return res;
  };
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
/** Branch Admin and Front Staff see only their own branch; undefined means no such limit. */
const ownBranchId = () =>
  mockSession.role === 'branch_admin' || mockSession.role === 'front_staff'
    ? (me().working_branch?.id ?? 0)
    : undefined;
/** The stock row of an item at a location, made empty on first use (like a first receipt). */
const stockRow = (locationId: number, item: S['Item']) => {
  let row = mockStore.stock.find((r) => r.location_id === locationId && r.item_id === item.id);
  if (!row) {
    row = {
      location_id: locationId,
      location_name: d.byBranch(String(locationId))?.name ?? '',
      item_id: item.id,
      sku: item.sku,
      item_name: item.name,
      on_hand: 0,
      reserved: 0,
      available: 0,
      quarantined: 0,
      reorder_level: null,
      low_stock: false,
    };
    mockStore.stock.push(row);
  }
  return row;
};
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

/** Super Admin only (403 for everyone else, like the real costed endpoints). */
const costedSa =
  (fn: Resolver): Resolver =>
  (info) =>
    mockSession.role === 'super_admin' ? fn(info) : forbidden();
/** A sale with each line's cost snapshot: the item's average cost, 2 dp. */
const withSaleCost = (sale: S['Sale']): S['CostedSale'] => ({
  ...sale,
  lines: sale.lines.map((l) => ({
    ...l,
    unit_cost: mockStore.items.find((i) => i.id === l.item_id)?.average_cost ?? '0.00',
  })),
});

/**
 * What a committed import does, like the real server: an existing SKU gets its opening quantity added
 * (a re-import adds again); a new SKU becomes a Draft item with no price, then gets its quantity.
 * Exported so the tests can run it without a multipart upload.
 */
export const commitCsv = (text: string, locationId: number) => {
  for (const row of parseCsv(text)) {
    let item = mockStore.items.find((i) => row.sku && i.sku === row.sku);
    if (!item) {
      const id = Math.max(0, ...mockStore.items.map((i) => i.id)) + 1;
      item = saveItem({
        ...mockStore.items[0],
        id,
        sku: row.sku || `SKU-${String(id).padStart(6, '0')}`,
        name: row.name,
        condition: conditions.find((c) => c === row.condition) ?? 'used',
        status: 'draft',
        selling_price: null,
        average_cost: row.unit_cost,
        image_url: null,
      });
    }
    const stock = stockRow(locationId, item);
    const qty = Number(row.opening_quantity);
    stock.on_hand += qty;
    stock.available += qty;
  }
};

/** Activity the caller may see: SA all, WA the warehouse, BA the own branch (contract 0.5.0). */
const activityScope = (): ((e: S['ActivityEvent']) => boolean) => {
  if (mockSession.role === 'warehouse_admin') return (e) => e.branch_id === d.warehouse.id;
  const own = ownBranchId();
  return own === undefined ? () => true : (e) => e.branch_id === own;
};
/** Activity list and export share scope, filters and ordering (contract 0.6.0). Returns an error response or the rows. */
const activityRows = (request: Request): Response | S['ActivityEvent'][] => {
  if (!me().permissions.includes('activity.view')) return forbidden();
  const p = new URL(request.url).searchParams;
  const own = ownBranchId();
  if (own !== undefined && p.get('branch_id') && Number(p.get('branch_id')) !== own)
    return err(403, 'wrong_branch', 'That is not your branch.');
  const day = /^\d{4}-\d{2}-\d{2}$/;
  const from = p.get('date_from');
  const to = p.get('date_to');
  const bad = [
    ['date_from', from],
    ['date_to', to],
  ].flatMap(([field, v]) =>
    v && (!day.test(v) || Number.isNaN(Date.parse(v)))
      ? [{ field, message: 'Use a date like 2026-11-24.' }]
      : [],
  );
  const ordering = p.get('ordering') ?? '-timestamp';
  if (!/^-?(timestamp|user|action)$/.test(ordering))
    bad.push({ field: 'ordering', message: 'Use timestamp, user or action, with an optional -.' });
  if (bad.length) return invalid(bad);
  if (from && to && from > to)
    return invalid([{ field: 'date_to', message: 'The end date is before the start date.' }]);
  const scope = activityScope();
  const q = (p.get('search') ?? '').toLowerCase();
  const key = (e: S['ActivityEvent']) =>
    ordering.endsWith('user') ? e.user_login_id : ordering.endsWith('action') ? e.action : e.id;
  const dir = ordering.startsWith('-') ? -1 : 1;
  return mockStore.activity
    .filter(
      (e) =>
        scope(e) &&
        (!p.get('user_id') || e.user_id === Number(p.get('user_id'))) &&
        (!p.get('branch_id') || e.branch_id === Number(p.get('branch_id'))) &&
        (!p.get('action') || e.action === p.get('action')) &&
        (!p.get('target_type') || e.target_type === p.get('target_type')) &&
        (!q ||
          [e.action, e.target_type, e.target_ref, e.user_login_id].some((v) =>
            v.toLowerCase().includes(q),
          )) &&
        // Accra is UTC+0 all year, so the calendar day is the ISO date.
        (!from || e.occurred_at.slice(0, 10) >= from) &&
        (!to || e.occurred_at.slice(0, 10) <= to),
    )
    .sort((x, y) => (key(x) < key(y) ? -dir : key(x) > key(y) ? dir : y.id - x.id));
};
const newestFirst = (rows: S['ActivityEvent'][]) => [...rows].sort((a, b) => b.id - a.id);

/** Shortfalls (dispatch lines received short) the caller may see: SA all, WA by sender, BA by destination. */
const shortfallRows = (): S['Shortfall'][] =>
  mockStore.dispatches.flatMap((disp) =>
    disp.lines.flatMap((l) => {
      if (l.qty_accepted === null || l.qty_sent <= l.qty_accepted) return [];
      const own = ownBranchId();
      if (mockSession.role === 'warehouse_admin' && disp.origin.id !== me().working_branch?.id)
        return [];
      if (mockSession.role === 'branch_admin' && disp.destination.id !== own) return [];
      const resolutions = mockStore.resolutions[l.id] ?? [];
      const resolved = resolutions.reduce((n, r) => n + r.quantity, 0);
      const shortfall = l.qty_sent - l.qty_accepted;
      return [
        {
          id: l.id,
          dispatch_id: disp.id,
          dispatch_reference: disp.reference,
          origin: disp.origin,
          destination: disp.destination,
          item_id: l.item_id,
          sku: l.sku,
          item_name: l.item_name,
          qty_sent: l.qty_sent,
          qty_accepted: l.qty_accepted,
          shortfall,
          resolved_quantity: resolved,
          remaining: shortfall - resolved,
          status: shortfall - resolved > 0 ? ('open' as const) : ('resolved' as const),
          received_at: disp.received_at ?? null,
          resolutions,
        },
      ];
    }),
  );

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
      const branch = byId(mockStore.branches, (await readJson(request)).branch_id);
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
      const type = params.get('branch_type');
      const active = params.get('is_active');
      return page(
        mockStore.branches.filter(
          (b) =>
            (!kind || b.kind === kind) &&
            (!type || b.branch_type === type) &&
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
      const typeError = branchTypeError(b.branch_type, false);
      if (typeError) return typeError;
      const branch_type = b.branch_type === 'warehouse' ? 'warehouse' : 'branch';
      const row = {
        id: Math.max(0, ...mockStore.branches.map((x) => x.id)) + 1,
        kind: branch_type,
        branch_type,
        code: text(b.code, ''),
        name: text(b.name, ''),
        is_active: true,
        created_at: d.t,
        updated_at: d.t,
      } satisfies S['Branch'];
      mockStore.branches.push(row);
      return HttpResponse.json(row, { status: 201 });
    }),
  ),
  http.get('/api/v1/branches/:id/', one(mockStore.branches)),
  patch(
    '/api/v1/branches/:id/',
    writeAuthed(async ({ params, request }) => {
      const row = byId(mockStore.branches, params.id);
      if (!row) return notFound();
      const b = await readJson(request);
      const typeError = branchTypeError(b.branch_type, true);
      if (typeError) return typeError;
      const type = (b.branch_type as S['Branch']['branch_type'] | undefined) ?? row.branch_type;
      // A warehouse becomes a branch only while no stock, receipt or dispatch references it.
      if (
        row.branch_type === 'warehouse' &&
        type === 'branch' &&
        (mockStore.stock.some((r) => r.location_id === row.id) ||
          mockStore.receipts.some((r) => r.location_id === row.id) ||
          mockStore.dispatches.some((x) => x.origin.id === row.id))
      )
        return invalid([
          { field: 'branch_type', message: 'This warehouse is in use and cannot become a branch.' },
        ]);
      Object.assign(row, {
        code: text(b.code, row.code),
        name: text(b.name, row.name),
        branch_type: type,
        kind: type,
      });
      return HttpResponse.json(row);
    }),
  ),
  post(
    '/api/v1/branches/:id/deactivate/',
    writeAuthed(({ params }) => {
      const row = byId(mockStore.branches, params.id);
      if (!row) return notFound();
      if (
        row.kind === 'warehouse' &&
        mockStore.branches.filter((x) => x.kind === 'warehouse' && x.is_active).length < 2
      ) {
        return err(
          409,
          'invalid_status_transition',
          'The last active warehouse cannot be deactivated.',
        );
      }
      return HttpResponse.json({ ...row, is_active: false });
    }),
  ),
  post(
    '/api/v1/branches/:id/activate/',
    writeAuthed(({ params }) => {
      const row = byId(mockStore.branches, params.id);
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
      const sa = mockSession.role === 'super_admin';
      const scope = activityScope();
      const where = sa ? only?.id : (me().working_branch?.id ?? 0);
      const low = mockStore.stock.filter(
        (r) => r.low_stock && (where === undefined || r.location_id === where),
      );
      return HttpResponse.json({
        ...d.dashboard,
        role: me().active_role,
        ...(sa && { location: only ?? null }),
        ...(sa ? {} : { stock_per_location: undefined }),
        low_stock_count: low.length,
        low_stock: low.slice(0, 10).map((r) => ({
          location_id: r.location_id,
          location_name: r.location_name,
          item_id: r.item_id,
          sku: r.sku,
          item_name: r.item_name,
          available: r.available,
          reorder_level: r.reorder_level ?? 0,
        })),
        recent_activity: newestFirst(mockStore.activity.filter(scope)).slice(0, 10),
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
      byId(mockStore.items, params.id)
        ? // "Every other active branch": the caller's own working branch is left out.
          HttpResponse.json(d.availability.filter((b) => b.branch_id !== me().working_branch?.id))
        : notFound(),
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
        mockStore.stock.filter(
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
    authed(({ request }) =>
      me().permissions.includes('goods_receipts.view')
        ? paged(request, [...mockStore.receipts].reverse().map(receiptFor))
        : forbidden(),
    ),
  ),
  post(
    '/api/v1/goods-receipts/',
    writeAuthed(async ({ request }) => {
      if (!me().permissions.includes('goods_receipts.manage')) return forbidden();
      const b = await readJson(request);
      const errors: S['Error']['errors'] = [];
      const supplier = text(b.supplier_name, '').trim();
      if (!supplier) errors.push({ field: 'supplier_name', message: 'Enter the supplier name.' });
      const lines = (Array.isArray(b.lines) ? b.lines : []) as Record<string, unknown>[];
      if (lines.length === 0) errors.push({ field: 'lines', message: 'Add at least one line.' });
      lines.forEach((l, i) => {
        if (!mockStore.items.some((x) => x.id === l.item_id && x.status === 'active'))
          errors.push({
            field: `lines.${i}.item_id`,
            message: 'Only active items can be received.',
          });
        if (lines.findIndex((x) => x.item_id === l.item_id) !== i)
          errors.push({
            field: `lines.${i}.item_id`,
            message: 'This item is on the receipt twice.',
          });
        if (!Number.isInteger(l.quantity) || (l.quantity as number) < 1)
          errors.push({
            field: `lines.${i}.quantity`,
            message: 'Enter a whole number, 1 or more.',
          });
        if (typeof l.unit_cost !== 'string' || !/^\d+\.\d{2}$/.test(l.unit_cost))
          errors.push({ field: `lines.${i}.unit_cost`, message: 'Enter a cost such as 900.00.' });
      });
      const wh = resolveWarehouse(b.warehouse_id);
      if (wh instanceof Response) return errors.length && wh.status === 400 ? invalid(errors) : wh;
      if (errors.length) return invalid(errors);
      const id = mockStore.receipts.length + 1;
      const receipt: S['GoodsReceipt'] = {
        id,
        reference: `GRN-${String(id).padStart(6, '0')}`,
        location_id: wh.id,
        supplier_name: supplier,
        notes: text(b.notes, ''),
        lines: lines.map((l, i) => {
          const item = byId(mockStore.items, l.item_id)!;
          const row = stockRow(wh.id, item);
          row.on_hand += l.quantity as number;
          row.available += l.quantity as number;
          return {
            id: id * 100 + i,
            item_id: item.id,
            sku: item.sku,
            item_name: item.name,
            quantity: l.quantity as number,
            unit_cost: l.unit_cost as string,
          };
        }),
        received_at: d.t,
        received_by: me().user.login_id,
      };
      mockStore.receipts.push(receipt);
      return HttpResponse.json(receipt, { status: 201 });
    }),
  ),
  http.get(
    '/api/v1/goods-receipts/:id/',
    authed(({ params }) => {
      if (!me().permissions.includes('goods_receipts.view')) return forbidden();
      const row = byId(mockStore.receipts, params.id);
      return row ? HttpResponse.json(receiptFor(row)) : notFound();
    }),
  ),

  http.get(
    '/api/v1/dispatches/',
    authed(({ request }) => {
      const p = new URL(request.url).searchParams;
      const own = ownBranchId();
      return paged(
        request,
        mockStore.dispatches.filter(
          (x) =>
            (own === undefined || x.destination.id === own) &&
            (!p.get('status') || x.status === p.get('status')) &&
            (!p.get('destination_id') || x.destination.id === Number(p.get('destination_id'))),
        ),
      );
    }),
  ),
  post(
    '/api/v1/dispatches/',
    writeAuthed(async ({ request }) => {
      if (!me().permissions.includes('dispatches.create')) return forbidden();
      const b = await readJson(request);
      const errors: S['Error']['errors'] = [];
      const to = mockStore.branches.find(
        (x) => x.id === b.destination_id && x.kind === 'branch' && x.is_active,
      );
      if (!to) errors.push({ field: 'destination_id', message: 'Choose an active branch.' });
      const lines = (Array.isArray(b.lines) ? b.lines : []) as Record<string, unknown>[];
      if (lines.length === 0) errors.push({ field: 'lines', message: 'Add at least one line.' });
      lines.forEach((l, i) => {
        if (!mockStore.items.some((x) => x.id === l.item_id && x.status === 'active'))
          errors.push({
            field: `lines.${i}.item_id`,
            message: 'Only active items can be dispatched.',
          });
        if (lines.findIndex((x) => x.item_id === l.item_id) !== i)
          errors.push({
            field: `lines.${i}.item_id`,
            message: 'This item is on the dispatch twice.',
          });
        if (!Number.isInteger(l.quantity) || (l.quantity as number) < 1)
          errors.push({
            field: `lines.${i}.quantity`,
            message: 'Enter a whole number, 1 or more.',
          });
      });
      const wh = resolveWarehouse(b.warehouse_id);
      if (wh instanceof Response) return errors.length && wh.status === 400 ? invalid(errors) : wh;
      if (errors.length || !to) return invalid(errors);
      for (const l of lines) {
        const item = byId(mockStore.items, l.item_id)!;
        const have = mockStore.stock.find(
          (r) => r.location_id === wh.id && r.item_id === item.id,
        )?.available;
        if ((have ?? 0) < (l.quantity as number)) {
          return err(
            409,
            'insufficient_stock',
            `Not enough ${item.name} at ${wh.name}: ${have ?? 0} available.`,
          );
        }
      }
      const id = mockStore.dispatches.length + 1;
      const made: S['Dispatch'] = {
        id,
        reference: `TRF-${String(id).padStart(6, '0')}`,
        origin: wh,
        destination: to,
        status: 'in_transit',
        lines: lines.map((l, i) => {
          const item = byId(mockStore.items, l.item_id)!;
          const row = stockRow(wh.id, item);
          row.reserved += l.quantity as number;
          row.available -= l.quantity as number;
          return {
            id: id * 100 + i,
            item_id: item.id,
            sku: item.sku,
            item_name: item.name,
            qty_sent: l.quantity as number,
            qty_received: null,
            qty_accepted: null,
            qty_rejected: null,
            shortfall: 0,
            line_note: null,
          };
        }),
        dispatched_at: d.t,
        dispatched_by: me().user.login_id,
        received_at: null,
        received_by: null,
        receive_note: null,
        has_open_discrepancy: false,
      };
      mockStore.dispatches.push(made);
      return HttpResponse.json(made, { status: 201 });
    }),
  ),
  http.get(
    '/api/v1/dispatches/waiting/',
    authed(({ request }) => {
      if (mockSession.role === 'warehouse_admin') return forbidden();
      const asked = new URL(request.url).searchParams.get('branch_id');
      const own = ownBranchId();
      if (own !== undefined && asked && Number(asked) !== own) return forbidden();
      const branch = own ?? (asked ? Number(asked) : undefined);
      if (branch === undefined)
        return invalid([{ field: 'branch_id', message: 'Choose a branch.' }]);
      return paged(
        request,
        mockStore.dispatches.filter(
          (x) => x.status === 'in_transit' && x.destination.id === branch,
        ),
      );
    }),
  ),
  http.get(
    '/api/v1/dispatches/:id/',
    authed(({ params }) => {
      const row = byId(mockStore.dispatches, params.id);
      if (!row) return notFound();
      const own = ownBranchId();
      return own !== undefined && row.destination.id !== own ? forbidden() : HttpResponse.json(row);
    }),
  ),
  post(
    '/api/v1/dispatches/:id/receive/',
    writeAuthed(async ({ params, request }) => {
      const row = byId(mockStore.dispatches, params.id);
      if (!row) return notFound();
      const own = ownBranchId();
      if (
        !me().permissions.includes('dispatches.receive') ||
        (own !== undefined && own !== row.destination.id)
      )
        return forbidden();
      if (row.status !== 'in_transit')
        return err(409, 'already_decided', 'This delivery already has a decision.');
      const b = await readJson(request);
      const decision = b.decision;
      if (decision !== 'approve_all' && decision !== 'approve_partial' && decision !== 'reject')
        return invalid([{ field: 'decision', message: 'Choose how to receive this delivery.' }]);
      if (decision === 'reject') {
        const reason = text(b.reason, '').trim();
        if (!reason) return invalid([{ field: 'reason', message: 'Give a reason for rejecting.' }]);
        row.status = 'rejected';
        row.receive_note = reason;
        for (const l of row.lines) {
          l.qty_received = 0;
          l.qty_accepted = 0;
          l.qty_rejected = l.qty_sent;
          l.shortfall = l.qty_sent;
        }
      } else {
        const got = (Array.isArray(b.lines) ? b.lines : []) as Record<string, unknown>[];
        const errors: S['Error']['errors'] = [];
        if (
          got.length !== row.lines.length ||
          !row.lines.every((l) => got.some((g) => g.line_id === l.id))
        )
          errors.push({ field: 'lines', message: 'Give every line once.' });
        got.forEach((g, i) => {
          const line = row.lines.find((l) => l.id === g.line_id);
          const r = g.qty_received;
          if (
            !line ||
            !Number.isInteger(r) ||
            !Number.isInteger(g.qty_accepted) ||
            (r as number) < 0
          )
            errors.push({
              field: `lines.${i}.qty_received`,
              message: 'Enter a whole number, 0 or more.',
            });
          else if ((r as number) > line.qty_sent)
            errors.push({
              field: `lines.${i}.qty_received`,
              message: `More than the ${line.qty_sent} that were sent.`,
            });
          else if ((g.qty_accepted as number) > (r as number))
            errors.push({ field: `lines.${i}.qty_accepted`, message: 'More than was received.' });
        });
        const short = got.some(
          (g) => g.qty_accepted !== row.lines.find((l) => l.id === g.line_id)?.qty_sent,
        );
        if (decision === 'approve_all' && short)
          errors.push({ field: 'decision', message: 'Approve all needs every line in full.' });
        if (decision === 'approve_partial' && !text(b.note, '').trim())
          errors.push({ field: 'note', message: 'Add a note about the shortfall.' });
        if (errors.length) return invalid(errors);
        for (const g of got) {
          const line = row.lines.find((l) => l.id === g.line_id)!;
          const a = g.qty_accepted as number;
          line.qty_received = g.qty_received as number;
          line.qty_accepted = a;
          line.qty_rejected = line.qty_received - a;
          line.shortfall = line.qty_sent - a;
          const item = byId(mockStore.items, line.item_id)!;
          const from = stockRow(d.warehouse.id, item);
          from.reserved -= a;
          from.on_hand -= a;
          const to = stockRow(row.destination.id, item);
          to.on_hand += a;
          to.available += a;
        }
        row.status = decision === 'approve_all' ? 'completed' : 'partially_received';
        row.receive_note = text(b.note, '').trim() || null;
      }
      row.received_at = d.t;
      row.received_by = me().user.login_id;
      row.has_open_discrepancy = row.lines.some((l) => l.shortfall > 0);
      return HttpResponse.json(row);
    }),
  ),

  // ---- Activity log and shortfalls (contract 0.5.0). Scope and rules live here, as on the real API. ----
  http.get(
    '/api/v1/activity-log/',
    authed(({ request }) => {
      const rows = activityRows(request);
      return rows instanceof Response ? rows : paged(request, rows);
    }),
  ),
  http.get(
    '/api/v1/activity-log/export/',
    authed(({ request }) => {
      const rows = activityRows(request);
      if (rows instanceof Response) return rows;
      const cap = 5000;
      const cell = (v: string | null) => {
        const x = v ?? '';
        return `"${(/^[=+\-@\t\r]/.test(x) ? `'${x}` : x).replace(/"/g, '""')}"`;
      };
      const lines = [
        'occurred_at,user_login_id,user_role,branch_name,action,target_type,target_ref,is_self_approval',
        ...rows
          .slice(0, cap)
          .map((e) =>
            [
              e.occurred_at,
              e.user_login_id,
              e.user_role,
              e.branch_name,
              e.action,
              e.target_type,
              e.target_ref,
              String(e.is_self_approval),
            ]
              .map(cell)
              .join(','),
          ),
      ];
      return new HttpResponse(lines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'X-Export-Truncated': String(rows.length > cap),
          'Access-Control-Expose-Headers': 'X-Export-Truncated',
        },
      });
    }),
  ),
  http.get(
    '/api/v1/shortfalls/',
    authed(({ request }) => {
      if (!me().permissions.includes('shortfalls.resolve')) return forbidden();
      const p = new URL(request.url).searchParams;
      const status = p.get('status');
      if (status && status !== 'open' && status !== 'resolved')
        return invalid([{ field: 'status', message: 'Use open or resolved.' }]);
      return paged(
        request,
        shortfallRows()
          .reverse()
          .filter(
            (r) =>
              (!status || r.status === status) &&
              (!p.get('dispatch_id') || r.dispatch_id === Number(p.get('dispatch_id'))),
          ),
      );
    }),
  ),
  post(
    '/api/v1/shortfalls/:id/resolve/',
    writeAuthed(async ({ request, params }) => {
      if (!me().permissions.includes('shortfalls.resolve')) return forbidden();
      // Out of the caller's scope is the same 404 as a missing id.
      const row = shortfallRows().find((r) => r.id === Number(params.id));
      if (!row) return notFound();
      if (row.remaining === 0)
        return err(409, 'conflict', 'This shortfall is already fully resolved.');
      const b = await readJson(request);
      const errors: S['Error']['errors'] = [];
      const kinds = ['return_to_sender', 'confirm_loss', 'record_damage'];
      if (!kinds.includes(String(b.resolution)))
        errors.push({ field: 'resolution', message: 'Choose what happened to the missing items.' });
      const q = b.quantity;
      if (!Number.isInteger(q) || (q as number) < 1 || (q as number) > 1_000_000)
        errors.push({ field: 'quantity', message: 'Enter a whole number, 1 or more.' });
      else if ((q as number) > row.remaining)
        errors.push({ field: 'quantity', message: `More than the ${row.remaining} still open.` });
      const note = text(b.note, '').trim();
      if (!note) errors.push({ field: 'note', message: 'Add a note.' });
      else if (note.length > 1000)
        errors.push({ field: 'note', message: 'Keep the note to 1000 characters.' });
      if (errors.length) return invalid(errors);
      const qty = q as number;
      const item = byId(mockStore.items, row.item_id)!;
      const from = stockRow(row.origin.id, item);
      from.reserved = Math.max(0, from.reserved - qty);
      if (b.resolution !== 'return_to_sender') from.on_hand = Math.max(0, from.on_hand - qty);
      from.available = from.on_hand - from.reserved;
      if (b.resolution === 'record_damage') stockRow(row.destination.id, item).quarantined += qty;
      const disp = mockStore.dispatches.find((x) => x.id === row.dispatch_id)!;
      mockStore.resolutionCount += 1;
      const selfApproved = disp.received_by === me().user.login_id;
      (mockStore.resolutions[row.id] ??= []).push({
        reference: `RES-${String(mockStore.resolutionCount).padStart(6, '0')}`,
        action: b.resolution as S['ShortfallResolve']['resolution'],
        quantity: qty,
        note,
        resolved_by: me().user.login_id,
        resolved_role: me().active_role,
        resolved_at: d.t,
        is_self_approval: selfApproved,
      });
      mockStore.activity.push({
        id: mockStore.activity.length + 1,
        occurred_at: d.t,
        user_id: me().user.id,
        user_login_id: me().user.login_id,
        user_role: me().active_role,
        branch_id: me().working_branch?.id ?? null,
        branch_name: me().working_branch?.name ?? null,
        action: 'shortfall_resolved',
        target_type: 'dispatch_line',
        target_ref: row.dispatch_reference,
        is_self_approval: selfApproved,
      });
      return HttpResponse.json(shortfallRows().find((r) => r.id === row.id));
    }),
  ),

  // ---- Sales (contract 0.4.0). Server rules live here, as on the real API: the client sends no price. ----
  http.get(
    '/api/v1/sales/',
    authed(({ request }) => {
      if (mockSession.role === 'warehouse_admin') return forbidden();
      const p = new URL(request.url).searchParams;
      const own = ownBranchId();
      if (own !== undefined && p.get('branch') && Number(p.get('branch')) !== own)
        return err(403, 'wrong_branch', 'That is not your branch.');
      return paged(
        request,
        [...mockStore.sales]
          .reverse()
          .filter(
            (s) =>
              (own === undefined || s.location.id === own) &&
              (!p.get('branch') || s.location.id === Number(p.get('branch'))) &&
              (!p.get('status') || s.status === p.get('status')) &&
              (!p.get('payment_method') || s.payment_method === p.get('payment_method')),
          ),
      );
    }),
  ),
  post(
    '/api/v1/sales/',
    writeAuthed(async ({ request }) => {
      if (!me().permissions.includes('sales.record')) return forbidden();
      const where = me().working_branch;
      if (!where) return err(403, 'wrong_branch', 'Choose your branch first.');
      const b = await readJson(request);
      const errors: S['Error']['errors'] = [];
      if (!['cash', 'mobile_money', 'card'].includes(String(b.payment_method)))
        errors.push({ field: 'payment_method', message: 'Pick a payment method.' });
      const lines = (Array.isArray(b.lines) ? b.lines : []) as Record<string, unknown>[];
      if (lines.length === 0) errors.push({ field: 'lines', message: 'Add at least one item.' });
      lines.forEach((l, i) => {
        const item = byId(mockStore.items, l.item_id);
        if (!Number.isInteger(l.quantity) || (l.quantity as number) < 1)
          errors.push({
            field: `lines.${i}.quantity`,
            message: 'Enter a whole number, 1 or more.',
          });
        if (lines.findIndex((x) => x.item_id === l.item_id) !== i)
          errors.push({ field: `lines.${i}.item_id`, message: 'This item is on the sale twice.' });
        if (!item || item.status !== 'active')
          errors.push({ field: `lines.${i}.item_id`, message: 'Only active items can be sold.' });
        else if (!item.selling_price)
          errors.push({ field: `lines.${i}.item_id`, message: 'This item has no price yet.' });
      });
      if (errors.length) return invalid(errors);
      // Overselling: nothing is written when any line is short (409 insufficient_stock).
      const short = lines.flatMap((l, i) => {
        const row = mockStore.stock.find(
          (r) => r.location_id === where.id && r.item_id === l.item_id,
        );
        const have = row?.available ?? 0;
        return (l.quantity as number) > have
          ? [
              {
                field: `lines.${i}.quantity`,
                message: `Only ${have} of ${byId(mockStore.items, l.item_id)?.name} available.`,
              },
            ]
          : [];
      });
      if (short.length)
        return err(409, 'insufficient_stock', 'Not enough stock for this sale.', short);
      let cents = 0;
      const money = (c: number) => (c / 100).toFixed(2);
      const saleLines = lines.map((l, i) => {
        const item = byId(mockStore.items, l.item_id)!;
        const unit = Math.round(Number(item.selling_price) * 100);
        const row = stockRow(where.id, item);
        row.on_hand -= l.quantity as number;
        row.available -= l.quantity as number;
        cents += unit * (l.quantity as number);
        return {
          id: (mockStore.sales.length + 1) * 100 + i,
          item_id: item.id,
          sku: item.sku,
          item_name: item.name,
          quantity: l.quantity as number,
          unit_price: money(unit),
          line_total: money(unit * (l.quantity as number)),
        };
      });
      const id = mockStore.sales.length + 1;
      const sale: S['Sale'] = {
        id,
        reference: `SAL-${String(id).padStart(6, '0')}`,
        location: where,
        staff: me().user.login_id,
        status: 'completed',
        payment_method: String(b.payment_method),
        total: money(cents),
        sold_at: d.t,
        lines: saleLines,
        cancellation: null,
      };
      mockStore.sales.push(sale);
      return HttpResponse.json(sale, { status: 201 });
    }),
  ),
  http.get(
    '/api/v1/sales/:id/',
    authed(({ params }) => {
      if (mockSession.role === 'warehouse_admin') return forbidden();
      const row = byId(mockStore.sales, params.id);
      const own = ownBranchId();
      // Another branch's sale is 404, the same as a missing id (OQ-30).
      return row && (own === undefined || row.location.id === own)
        ? HttpResponse.json(row)
        : notFound();
    }),
  ),
  post(
    '/api/v1/sales/:id/cancel/',
    writeAuthed(async ({ request, params }) => {
      if (mockSession.role !== 'super_admin' && mockSession.role !== 'branch_admin')
        return forbidden();
      const row = byId(mockStore.sales, params.id);
      const own = ownBranchId();
      if (!row || (own !== undefined && row.location.id !== own)) return notFound();
      const reason = text((await readJson(request)).reason, '').trim();
      if (!reason) return invalid([{ field: 'reason', message: 'Give a reason.' }]);
      if (row.status !== 'completed')
        return err(409, 'conflict', 'Only a completed sale can be cancelled.');
      for (const l of row.lines) {
        const r = mockStore.stock.find(
          (x) => x.location_id === row.location.id && x.item_id === l.item_id,
        );
        if (r) {
          r.on_hand += l.quantity;
          r.available += l.quantity;
        }
      }
      row.status = 'cancelled';
      row.cancellation = {
        reason,
        cancelled_by: me().user.login_id,
        cancelled_role: mockSession.role,
        cancelled_at: d.t,
      };
      return HttpResponse.json(row);
    }),
  ),

  // ---- Costed sales (contract 0.4.1): Super Admin only; the cost is the item's average cost at the time. ----
  http.get(
    '/api/v1/costed-sales/',
    authed(
      costedSa(({ request }) => {
        const p = new URL(request.url).searchParams;
        return paged(
          request,
          [...mockStore.sales]
            .reverse()
            .filter(
              (s) =>
                (!p.get('branch') || s.location.id === Number(p.get('branch'))) &&
                (!p.get('status') || s.status === p.get('status')) &&
                (!p.get('payment_method') || s.payment_method === p.get('payment_method')),
            )
            .map(withSaleCost),
        );
      }),
    ),
  ),
  http.get(
    '/api/v1/costed-sales/:id/',
    authed(
      costedSa(({ params }) => {
        const row = byId(mockStore.sales, params.id);
        return row ? HttpResponse.json(withSaleCost(row)) : notFound();
      }),
    ),
  ),

  // ---- CSV import (contract 0.4.0). ----
  post(
    '/api/v1/item-imports/',
    writeAuthed(async ({ request }) => {
      if (mockSession.role !== 'super_admin' && mockSession.role !== 'warehouse_admin')
        return forbidden();
      let form: FormData;
      try {
        form = await request.formData();
      } catch {
        return invalid([{ field: 'file', message: 'Send the CSV as a file.' }]);
      }
      const mode = form.get('dry_run');
      if (mode !== 'true' && mode !== 'false')
        return invalid([{ field: 'dry_run', message: 'dry_run must be true or false.' }]);
      const file = form.get('file');
      if (!(file instanceof Blob))
        return invalid([{ field: 'file', message: 'Choose a CSV file.' }]);
      if (file.size > 2 * 1024 * 1024)
        return err(413, 'payload_too_large', 'The file is over 2 MB.');
      const loc = form.get('location_id');
      if (mockSession.role === 'super_admin' && !loc)
        return invalid([{ field: 'location_id', message: 'Choose a location.' }]);
      const locationId = mockSession.role === 'warehouse_admin' ? d.warehouse.id : Number(loc);
      const r = checkCsv(
        await file.text(),
        mockStore.items.map((i) => i.sku),
      );
      const commit = mode === 'false' && r.errors.length === 0;
      if (commit) {
        mockStore.imports += 1;
        commitCsv(await file.text(), locationId);
      }
      return HttpResponse.json({
        ...r,
        dry_run: mode === 'true',
        committed: commit,
        batch_reference: commit ? `IMP-${String(mockStore.imports).padStart(6, '0')}` : null,
        location_id: locationId,
      } satisfies S['ItemImportReport']);
    }),
  ),
];
