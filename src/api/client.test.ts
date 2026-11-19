// @vitest-environment node
// Typed client (F1.4): cookie, CSRF and Idempotency-Key headers, and the typed error mapping.
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { MOCK_PASSWORD } from '../mocks/fixtures.ts';
import { resetMockSession } from '../mocks/handlers.ts';
import { server } from '../mocks/server.ts';
import { ApiError, createApiClient, newIdempotencyKey } from './index.ts';

const ORIGIN = 'http://api.test';
let cookie: string | undefined = 'mock-csrf-token';
const client = createApiClient({ baseUrl: ORIGIN, getCookie: () => cookie });

beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterEach(() => {
  server.resetHandlers();
  resetMockSession();
  cookie = 'mock-csrf-token';
});
afterAll(() => {
  server.close();
});

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error('expected the request to fail');
}

const errorBody = (code: string, message: string, errors: unknown[] = []) => ({
  code,
  message,
  errors,
});

describe('requests', () => {
  it('returns typed data and asks fetch for same-origin credentials', async () => {
    let credentials: string | undefined;
    server.use(
      http.get('*/api/v1/auth/session/', ({ request }) => {
        credentials = request.credentials;
        return HttpResponse.json({ authenticated: false, needs_branch_selection: false });
      }),
    );
    const state = await client.request('get', '/api/v1/auth/session/');
    expect(state.authenticated).toBe(false);
    expect(credentials).toBe('same-origin');
  });

  it('echoes the csrftoken cookie in X-CSRFToken on unsafe methods only', async () => {
    const seen: Record<string, string | null> = {};
    server.use(
      http.get('*/api/v1/auth/me/', ({ request }) => {
        seen.get = request.headers.get('X-CSRFToken');
        return HttpResponse.json(errorBody('not_authenticated', 'Please sign in.'), {
          status: 401,
        });
      }),
      http.post('*/api/v1/auth/logout/', ({ request }) => {
        seen.post = request.headers.get('X-CSRFToken');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await failure(client.request('get', '/api/v1/auth/me/'));
    await client.request('post', '/api/v1/auth/logout/');
    expect(seen.get).toBeNull();
    expect(seen.post).toBe('mock-csrf-token');
  });

  it('probes the session once to get the CSRF cookie when it is missing', async () => {
    cookie = undefined;
    let probes = 0;
    let sent: string | null = null;
    server.use(
      http.get('*/api/v1/auth/session/', () => {
        probes += 1;
        cookie = 'fresh-token';
        return HttpResponse.json({ authenticated: false, needs_branch_selection: false });
      }),
      http.post('*/api/v1/auth/logout/', ({ request }) => {
        sent = request.headers.get('X-CSRFToken');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    await client.request('post', '/api/v1/auth/logout/');
    expect(probes).toBe(1);
    expect(sent).toBe('fresh-token');
  });

  it('sends Idempotency-Key where the contract requires it, and a JSON body', async () => {
    const key = newIdempotencyKey();
    let header: string | null = null;
    let body: unknown;
    server.use(
      http.post('*/api/v1/sales/', async ({ request }) => {
        header = request.headers.get('Idempotency-Key');
        body = await request.json();
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await client.request('post', '/api/v1/sales/', {
      idempotencyKey: key,
      body: { lines: [{ item: 1, quantity: '1' }] } as never,
    });
    expect(header).toBe(key);
    expect(body).toMatchObject({ lines: [{ item: 1, quantity: '1' }] });
  });

  it('fills path parameters and the query string', async () => {
    let url = '';
    server.use(
      http.get('*/api/v1/users/:id/', ({ request }) => {
        url = request.url;
        return HttpResponse.json({});
      }),
      http.get('*/api/v1/branches/', ({ request }) => {
        url = request.url;
        return HttpResponse.json({});
      }),
    );
    await client.request('get', '/api/v1/users/{user_id}/', { path: { user_id: 7 } });
    expect(new URL(url).pathname).toBe('/api/v1/users/7/');
    await client.request('get', '/api/v1/branches/', { query: { page: 2, kind: 'branch' } });
    expect(new URL(url).search).toBe('?page=2&kind=branch');
  });

  it('works end to end against the mock handlers', async () => {
    await client.request('post', '/api/v1/auth/login/', {
      body: { login_id: 'SA-0001', password: MOCK_PASSWORD },
    });
    const me = await client.request('get', '/api/v1/auth/me/');
    expect(me.user.login_id).toBe('SA-0001');
    const branches = await client.request('get', '/api/v1/branches/');
    expect(branches.results.length).toBeGreaterThan(0);
  });
});

describe('typing', () => {
  it('rejects wrong calls at compile time (checked by tsc)', () => {
    const never = async () => {
      // @ts-expect-error: not a path of the contract
      await client.request('get', '/api/v1/nope/');
      // @ts-expect-error: the contract has no DELETE on this path
      await client.request('delete', '/api/v1/auth/me/');
      // @ts-expect-error: Idempotency-Key is required by the contract for this operation
      await client.request('post', '/api/v1/sales/', { body: {} as never });
      // @ts-expect-error: path parameter user_id is required
      await client.request('get', '/api/v1/users/{user_id}/');
    };
    expect(never).toBeTypeOf('function');
  });
});

describe('error mapping', () => {
  it('400 keeps every errors[].field', async () => {
    server.use(
      http.post('*/api/v1/auth/change-password/', () =>
        HttpResponse.json(
          {
            ...errorBody('validation_error', 'Please correct the highlighted fields.', [
              {
                field: 'new_password',
                code: 'too_short',
                message: 'Use at least 10 characters.',
              },
            ]),
            request_id: '0b2e5a8c-3f77-4c1f-9a43-7a2b6f1d9e10',
          },
          { status: 400 },
        ),
      ),
    );
    const invalid = await failure(
      client.request('post', '/api/v1/auth/change-password/', {
        body: { current_password: 'x', new_password: 'y' },
      }),
    );
    expect(invalid.kind).toBe('validation');
    expect(invalid.messagesFor('new_password')).toEqual(['Use at least 10 characters.']);
    expect(invalid.requestId).toBe('0b2e5a8c-3f77-4c1f-9a43-7a2b6f1d9e10');
  });

  it('401 is unauthenticated', async () => {
    const error = await failure(client.request('get', '/api/v1/auth/me/'));
    expect(error.kind).toBe('unauthenticated');
  });

  it('409 insufficient stock keeps the field and code', async () => {
    server.use(
      http.post('*/api/v1/sales/', () =>
        HttpResponse.json(
          errorBody('conflict', 'That quantity is more than the stock at this branch.', [
            {
              field: 'lines[0].quantity',
              code: 'insufficient_stock',
              message: 'Only 3 available at this branch.',
            },
          ]),
          { status: 409 },
        ),
      ),
    );
    const error = await failure(
      client.request('post', '/api/v1/sales/', {
        idempotencyKey: newIdempotencyKey(),
        body: {} as never,
      }),
    );
    expect(error.kind).toBe('conflict');
    expect(error.status).toBe(409);
    expect(error.fieldErrors[0]).toMatchObject({
      field: 'lines[0].quantity',
      code: 'insufficient_stock',
    });
    expect(error.message).toBe('That quantity is more than the stock at this branch.');
  });

  it('403 password_change_required is its own kind; other 403 is forbidden', async () => {
    await client.request('post', '/api/v1/auth/login/', {
      body: { login_id: 'USR-0009', password: MOCK_PASSWORD },
    });
    const must = await failure(client.request('get', '/api/v1/branches/'));
    expect(must.kind).toBe('password_change_required');
    expect(must.code).toBe('password_change_required');
    server.use(
      http.get('*/api/v1/branches/', () =>
        HttpResponse.json(errorBody('permission_denied', 'You are not allowed to do that.'), {
          status: 403,
        }),
      ),
    );
    expect((await failure(client.request('get', '/api/v1/branches/'))).kind).toBe('forbidden');
  });

  it('429 carries Retry-After, 404 maps, a non-standard body falls back', async () => {
    const locked = await failure(
      client.request('post', '/api/v1/auth/login/', {
        body: { login_id: 'SA-0001', password: 'locked' },
      }),
    );
    expect(locked.kind).toBe('rate_limited');
    expect(locked.retryAfterSeconds).toBe(900);
    server.use(
      http.get('*/api/v1/branches/', () => new HttpResponse('<html>oops</html>', { status: 502 })),
    );
    const odd = await failure(client.request('get', '/api/v1/branches/'));
    expect(odd.kind).toBe('unknown');
    expect(odd.status).toBe(502);
    server.use(
      http.get('*/api/v1/branches/', () =>
        HttpResponse.json(errorBody('not_found', 'We could not find that.'), { status: 404 }),
      ),
    );
    expect((await failure(client.request('get', '/api/v1/branches/'))).kind).toBe('not_found');
  });

  it('a request that gets no answer is a network error', async () => {
    server.use(http.get('*/api/v1/branches/', () => HttpResponse.error()));
    const error = await failure(client.request('get', '/api/v1/branches/'));
    expect(error.kind).toBe('network');
  });
});
