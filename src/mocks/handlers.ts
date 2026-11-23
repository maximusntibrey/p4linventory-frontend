import { http, HttpResponse, type RequestHandler } from 'msw';
import type { components } from '../api/schema';
import * as d from './data';

type S = components['schemas'];

/** Mock login state. Starts logged out so the login screen can be built against it. Tests set or reset it. */
export const mockSession: { loggedIn: boolean; role: d.MockRole } = {
  loggedIn: false,
  role: 'super_admin',
};
const me = () => d.meByRole[mockSession.role];
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
const byId = <T extends { id: number }>(rows: T[], id: unknown) =>
  rows.find((r) => r.id === Number(id));
/** The only item fields a create or update may change; anything else in the body is dropped. */
const itemFields = (b: Record<string, unknown>, row: S['Item']) =>
  ({
    name: text(b.name, row.name),
    model_name: text(b.model_name, row.model_name),
    mpn: text(b.mpn, row.mpn),
    description: text(b.description, row.description ?? ''),
    search_keywords: text(b.search_keywords, row.search_keywords ?? ''),
    show_on_website: flag(b.show_on_website, row.show_on_website),
    selling_price: typeof b.selling_price === 'string' ? b.selling_price : row.selling_price,
  }) satisfies Partial<S['Item']>;
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
/** Logged-in endpoints answer 401 until the mock login has happened. */
const authed =
  (fn: Resolver): Resolver =>
  (info) =>
    mockSession.loggedIn ? fn(info) : unauthorized();
/** The contract requires an Idempotency-Key on these POSTs. */
const keyed =
  (fn: Resolver): Resolver =>
  (info) =>
    info.request.headers.get('Idempotency-Key')
      ? fn(info)
      : invalid([{ field: null, message: 'Idempotency-Key header is required.' }]);
/** State-changing operations: logged in, then the Idempotency-Key check. */
const writeAuthed = (fn: Resolver): Resolver => authed(keyed(fn));
/** Cost endpoints are for SA/WA; the mock's Branch Admin and Front Staff sessions get 403. */
const costed =
  (fn: Resolver): Resolver =>
  (info) =>
    mockSession.role === 'branch_admin' || mockSession.role === 'front_staff'
      ? forbidden()
      : fn(info);
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
    mockSession.loggedIn = true;
    mockSession.role = d.roleOfLogin(b.login_id);
    return HttpResponse.json(me());
  }),
  post(
    '/api/v1/auth/logout/',
    authed(() => {
      mockSession.loggedIn = false;
      return new HttpResponse(null, { status: 204 });
    }),
  ),
  http.get(
    '/api/v1/auth/me/',
    authed(() => HttpResponse.json(me())),
  ),
  post(
    '/api/v1/auth/password/',
    authed(async ({ request }) => {
      const b = await readJson(request);
      if (typeof b.new_password !== 'string' || b.new_password.length < 10) {
        return invalid([{ field: 'new_password', message: 'Use at least 10 characters.' }]);
      }
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  http.get(
    '/api/v1/working-branch/',
    authed(() =>
      mockSession.role === 'branch_admin'
        ? forbidden()
        : HttpResponse.json({ working_branch: me().working_branch }),
    ),
  ),
  put(
    '/api/v1/working-branch/',
    writeAuthed(async ({ request }) => {
      const branch = byId(d.branches, (await readJson(request)).branch_id);
      return branch
        ? HttpResponse.json({ ...me(), working_branch: branch })
        : invalid([{ field: 'branch_id', message: 'Pick one of the listed branches.' }]);
    }),
  ),

  http.get(
    '/api/v1/branches/',
    authed(() => page(d.branches)),
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
    authed(() => page(d.users)),
  ),
  post(
    '/api/v1/users/',
    writeAuthed(async ({ request }) => {
      const b = await readJson(request);
      return HttpResponse.json(
        {
          ...d.users[1],
          id: 4,
          login_id: 'USR-0003',
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
    authed(() =>
      HttpResponse.json({
        ...d.dashboard,
        role: me().active_role,
        ...(mockSession.role === 'super_admin' ? {} : { stock_per_location: undefined }),
      } satisfies S['Dashboard']),
    ),
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
        ? HttpResponse.json(d.fieldDefinitions)
        : invalid([{ field: 'category_id', message: 'This field is required.' }]),
    ),
  ),
  http.get(
    '/api/v1/items/',
    authed(() => page(d.items)),
  ),
  http.get('/api/v1/costed-items/', authed(costed(() => page(d.costedItems)))),
  http.get('/api/v1/costed-items/:id/', authed(costed(one(d.costedItems)))),
  post(
    '/api/v1/items/',
    writeAuthed(async ({ request }) => {
      const b = await readJson(request);
      if (inactiveBrand(b.brand_id)) return brandInactive();
      return HttpResponse.json(
        {
          ...d.costedItems[1],
          ...itemFields(b, d.costedItems[1]),
          id: 3,
          sku: 'SKU-000003',
          status: 'draft',
          warnings: [],
        } satisfies S['ItemWithCostAndWarnings'],
        { status: 201 },
      );
    }),
  ),
  http.get('/api/v1/items/:id/', one(d.items)),
  patch(
    '/api/v1/items/:id/',
    writeAuthed(async ({ params, request }) => {
      const row = byId(d.costedItems, params.id);
      if (!row) return notFound();
      const b = await readJson(request);
      if (inactiveBrand(b.brand_id)) return brandInactive();
      return HttpResponse.json({
        ...row,
        ...itemFields(b, row),
        warnings: [],
      } satisfies S['ItemWithCostAndWarnings']);
    }),
  ),
  post(
    '/api/v1/items/:id/status/',
    writeAuthed(async ({ params, request }) => {
      const row = byId(d.costedItems, params.id);
      if (!row) return notFound();
      const b = await readJson(request);
      return HttpResponse.json({
        ...row,
        status: b.status as S['ItemStatus'],
      } satisfies S['ItemWithCost']);
    }),
  ),
  put(
    '/api/v1/items/:id/image/',
    writeAuthed(({ params }) => {
      const row = byId(d.costedItems, params.id);
      return row
        ? HttpResponse.json({
            ...row,
            image_url: '/media/items/mock.png',
          } satisfies S['ItemWithCost'])
        : notFound();
    }),
  ),
  http.get(
    '/api/v1/items/:id/branch-availability/',
    authed(({ params }) =>
      byId(d.items, params.id) ? HttpResponse.json(d.availability) : notFound(),
    ),
  ),

  http.get(
    '/api/v1/stock/',
    authed(() => page(d.stock)),
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
