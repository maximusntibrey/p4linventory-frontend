// @vitest-environment node
// Contract-conformance (F1.4): every mock response is checked against the schema the contract
// declares for that operation and status, and every mock handler must be an operation that exists.
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { contract, declaresStatus, responseSchema, validate } from '../test/contract.ts';
import { MOCK_PASSWORD } from './fixtures.ts';
import { handlers, MOCK_X_ROLES, resetMockSession } from './handlers.ts';
import { server } from './server.ts';

const ORIGIN = 'http://mock.test';

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  resetMockSession();
});
afterAll(() => {
  server.close();
});

async function call(method: string, path: string, body?: unknown) {
  const response = await fetch(`${ORIGIN}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, json: text ? (JSON.parse(text) as unknown) : undefined };
}

function expectConforms(
  method: string,
  path: string,
  result: { status: number; json: unknown },
  status: number,
) {
  expect(result.status).toBe(status);
  expect(
    declaresStatus(path, method.toLowerCase(), status),
    `contract declares ${String(status)}`,
  ).toBe(true);
  const schema = responseSchema(path, method.toLowerCase(), status);
  if (schema === undefined) {
    expect(result.json, 'no JSON body declared').toBeUndefined();
  } else {
    expect(validate(schema, result.json)).toEqual([]);
  }
}

async function signIn(loginId: string) {
  return call('POST', '/api/v1/auth/login/', { login_id: loginId, password: MOCK_PASSWORD });
}

describe('mock handlers exist in the contract', () => {
  it('every handler is an operation of the vendored contract', () => {
    const paths = contract.paths as Record<string, Record<string, unknown>>;
    for (const handler of handlers) {
      const info = handler.info as { method: string; path: string };
      const path = info.path.replace(/^\*/, '');
      expect(paths[path]?.[info.method.toLowerCase()], `${info.method} ${path}`).toBeDefined();
    }
  });
});

describe('mock responses conform to the contract', () => {
  it('session probe', async () => {
    expectConforms('GET', '/api/v1/auth/session/', await call('GET', '/api/v1/auth/session/'), 200);
  });

  it.each(['SA-0001', 'USR-0002', 'USR-0009'])('login %s, then me', async (loginId) => {
    expectConforms('POST', '/api/v1/auth/login/', await signIn(loginId), 200);
    expectConforms('GET', '/api/v1/auth/me/', await call('GET', '/api/v1/auth/me/'), 200);
  });

  it('login failures: wrong password 401, lock 429', async () => {
    const wrong = await call('POST', '/api/v1/auth/login/', { login_id: 'SA-0001', password: 'x' });
    expectConforms('POST', '/api/v1/auth/login/', wrong, 401);
    const locked = await call('POST', '/api/v1/auth/login/', {
      login_id: 'SA-0001',
      password: 'locked',
    });
    expectConforms('POST', '/api/v1/auth/login/', locked, 429);
  });

  it('me without a session is 401 in the standard error shape', async () => {
    expectConforms('GET', '/api/v1/auth/me/', await call('GET', '/api/v1/auth/me/'), 401);
  });

  it('logout 204', async () => {
    await signIn('SA-0001');
    expectConforms('POST', '/api/v1/auth/logout/', await call('POST', '/api/v1/auth/logout/'), 204);
  });

  it('change password: 400 with a field error, then 204', async () => {
    await signIn('USR-0009');
    const bad = await call('POST', '/api/v1/auth/change-password/', {
      current_password: 'x',
      new_password: 'a-new-password-1',
    });
    expectConforms('POST', '/api/v1/auth/change-password/', bad, 400);
    const ok = await call('POST', '/api/v1/auth/change-password/', {
      current_password: MOCK_PASSWORD,
      new_password: 'a-new-password-1',
    });
    expectConforms('POST', '/api/v1/auth/change-password/', ok, 204);
  });

  it('selectable branches and switching the active branch', async () => {
    await signIn('USR-0002');
    const list = await call('GET', '/api/v1/context/branches/');
    expectConforms('GET', '/api/v1/context/branches/', list, 200);
    const switched = await call('PUT', '/api/v1/context/active-branch/', { branch: 2 });
    expectConforms('PUT', '/api/v1/context/active-branch/', switched, 200);
    const bad = await call('PUT', '/api/v1/context/active-branch/', { branch: 999 });
    expectConforms('PUT', '/api/v1/context/active-branch/', bad, 400);
  });

  it('branches, users and dashboard shell lists', async () => {
    await signIn('SA-0001');
    for (const path of ['/api/v1/branches/', '/api/v1/users/', '/api/v1/dashboard/shell/']) {
      expectConforms('GET', path, await call('GET', path), 200);
    }
  });

  it('403 password_change_required while the one-time password is unchanged', async () => {
    await signIn('USR-0009');
    const result = await call('GET', '/api/v1/branches/');
    expectConforms('GET', '/api/v1/branches/', result, 403);
    expect((result.json as { code: string }).code).toBe('password_change_required');
  });
});

describe('mock permissions follow x-roles', () => {
  it('the mock role table equals the contract x-roles', () => {
    const paths = contract.paths as Record<string, Record<string, { 'x-roles'?: string[] }>>;
    for (const [path, roles] of Object.entries(MOCK_X_ROLES)) {
      expect(roles, path).toEqual(paths[path]?.get?.['x-roles']);
    }
  });

  it('Front Staff gets 403 permission_denied on /users/', async () => {
    await signIn('USR-0002');
    const result = await call('GET', '/api/v1/users/');
    expectConforms('GET', '/api/v1/users/', result, 403);
    expect((result.json as { code: string }).code).toBe('permission_denied');
  });

  it('Super Admin may list users', async () => {
    await signIn('SA-0001');
    expect((await call('GET', '/api/v1/users/')).status).toBe(200);
  });
});

describe('the checker itself', () => {
  it('rejects a response that does not match the schema', () => {
    const schema = responseSchema('/api/v1/auth/session/', 'get', 200);
    expect(validate(schema, { authenticated: 'yes' })).not.toEqual([]);
    expect(validate(schema, { authenticated: true, needs_branch_selection: false })).toEqual([]);
  });
});
