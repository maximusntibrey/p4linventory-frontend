// MSW handlers for the mock API (F1.4): contract-shaped responses for auth, context, branches,
// users and the dashboard shell. The URLs come from the generated `paths`, so an endpoint that
// leaves the contract fails the typecheck. The mock holds a tiny session in memory (who is signed
// in, which branch is active); it applies no real rule, it only lets screens be built and tested.
//
// Scenarios, chosen by the login ID typed on the form: SA-0001 (super admin), USR-0002 (front
// staff), USR-0009 (must change password). Password for all: MOCK_PASSWORD. Password `locked`
// answers 429.
import { http, HttpResponse } from 'msw';

import type { paths } from '../api/schema.gen.ts';
import {
  accounts,
  branches,
  dashboardShell,
  errorBody,
  MOCK_PASSWORD,
  type MockAccount,
  page,
  accra,
  kumasi,
  warehouse,
} from './fixtures.ts';

type Path = keyof paths;

// MSW matches the path part; `*` lets it match any origin (same-origin in the browser, a test host in Vitest).
const at = (path: Path): string => `*${path}`;

let signedIn: MockAccount | undefined;
let activeBranch: MockAccount['me']['active_branch'] = null;
let passwordChanged = false;

export function resetMockSession(): void {
  signedIn = undefined;
  activeBranch = null;
  passwordChanged = false;
}

function currentMe(): MockAccount['me'] | undefined {
  if (!signedIn) return undefined;
  const mustChange = signedIn.me.must_change_password && !passwordChanged;
  return {
    ...signedIn.me,
    must_change_password: mustChange,
    active_branch: activeBranch ?? signedIn.me.active_branch,
    needs_branch_selection: (activeBranch ?? signedIn.me.active_branch) === null,
  };
}

const unauthenticated = () =>
  HttpResponse.json(errorBody('not_authenticated', 'Please sign in to continue.'), { status: 401 });
const passwordChangeRequired = () =>
  HttpResponse.json(
    errorBody('password_change_required', 'Please choose a new password before you continue.'),
    { status: 403 },
  );

export const MOCK_X_ROLES: Partial<Record<Path, string[]>> = {
  '/api/v1/branches/': ['super_admin', 'warehouse_admin', 'branch_admin', 'front_staff'],
  '/api/v1/users/': ['super_admin'],
  '/api/v1/dashboard/shell/': ['super_admin', 'warehouse_admin', 'branch_admin', 'front_staff'],
};

// For endpoints that need a session and are closed while a one-time password is unchanged.
// `roles` is the operation's x-roles in the contract (a test keeps MOCK_X_ROLES equal to it).
function guarded(path: Path, body: () => object): Response {
  const me = currentMe();
  if (!me) return unauthenticated();
  if (me.must_change_password) return passwordChangeRequired();
  if (!MOCK_X_ROLES[path]?.includes(me.role)) {
    return HttpResponse.json(errorBody('permission_denied', 'You are not allowed to do that.'), {
      status: 403,
    });
  }
  return HttpResponse.json(body());
}

export const handlers = [
  http.get(at('/api/v1/auth/session/'), () => {
    const me = currentMe();
    return HttpResponse.json(
      {
        authenticated: me !== undefined,
        needs_branch_selection: me?.needs_branch_selection ?? false,
      },
      { headers: { 'Set-Cookie': 'csrftoken=mock-csrf-token; Path=/' } },
    );
  }),

  http.post(at('/api/v1/auth/login/'), async ({ request }) => {
    const body = (await request.json()) as { login_id?: string; password?: string };
    if (body.password === 'locked') {
      return HttpResponse.json(
        errorBody('rate_limited', 'Too many attempts. Try again in 15 minutes.'),
        { status: 429, headers: { 'Retry-After': '900' } },
      );
    }
    const found = body.login_id ? accounts[body.login_id] : undefined;
    if (!found || body.password !== MOCK_PASSWORD) {
      return HttpResponse.json(
        errorBody('invalid_credentials', 'The ID or password is not right.'),
        {
          status: 401,
        },
      );
    }
    signedIn = found;
    activeBranch = null;
    passwordChanged = false;
    return HttpResponse.json(currentMe() as never);
  }),

  http.post(at('/api/v1/auth/logout/'), () => {
    if (!signedIn) return unauthenticated();
    resetMockSession();
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(at('/api/v1/auth/me/'), () => {
    const me = currentMe();
    return me ? HttpResponse.json(me) : unauthenticated();
  }),

  http.post(at('/api/v1/auth/change-password/'), async ({ request }) => {
    if (!signedIn) return unauthenticated();
    const body = (await request.json()) as { current_password?: string; new_password?: string };
    if (body.current_password !== MOCK_PASSWORD) {
      return HttpResponse.json(
        errorBody('validation_error', 'Please correct the highlighted fields.', [
          {
            field: 'current_password',
            code: 'wrong_password',
            message: 'The current password is not right.',
          },
        ]),
        { status: 400 },
      );
    }
    passwordChanged = true;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(at('/api/v1/context/branches/'), () => {
    const me = currentMe();
    if (!me) return unauthenticated();
    if (me.must_change_password) return passwordChangeRequired();
    const list =
      me.role === 'super_admin'
        ? [warehouse, accra, kumasi]
        : me.role === 'front_staff'
          ? [accra, kumasi]
          : me.permanent_branch
            ? [me.permanent_branch]
            : [];
    return HttpResponse.json(list);
  }),

  http.put(at('/api/v1/context/active-branch/'), async ({ request }) => {
    const me = currentMe();
    if (!me) return unauthenticated();
    if (me.must_change_password) return passwordChangeRequired();
    const body = (await request.json()) as { branch?: number };
    const chosen = [warehouse, accra, kumasi].find((b) => b.id === body.branch);
    if (!chosen) {
      return HttpResponse.json(
        errorBody('validation_error', 'Please correct the highlighted fields.', [
          { field: 'branch', code: 'invalid_choice', message: 'Choose one of your branches.' },
        ]),
        { status: 400 },
      );
    }
    activeBranch = chosen;
    return HttpResponse.json(currentMe() as never);
  }),

  http.get(at('/api/v1/branches/'), () => guarded('/api/v1/branches/', () => page(branches))),

  http.get(at('/api/v1/users/'), () =>
    guarded('/api/v1/users/', () => page(Object.values(accounts).map((a) => a.user))),
  ),

  http.get(at('/api/v1/dashboard/shell/'), () =>
    guarded('/api/v1/dashboard/shell/', () => dashboardShell),
  ),
];
