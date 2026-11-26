import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { mockSession } from '../mocks/handlers';
import { api, ApiError, newIdempotencyKey } from './client';

const catchError = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as ApiError;
  }
  throw new Error('expected a rejection');
};

describe('api client', () => {
  it('returns typed data on success', async () => {
    expect(await api('get', '/health/')).toEqual({ status: 'ok', database: 'ok' });
  });

  it('sends path params and query', async () => {
    mockSession.loggedIn = true;
    const b = await api('get', '/api/v1/branches/{id}/', { path: { id: 2 } });
    expect(b.name).toBe('Accra Branch');
    let seen = '';
    server.use(
      http.get('/api/v1/items/', ({ request }) => {
        seen = new URL(request.url).search;
        return HttpResponse.json({
          count: 0,
          page: 1,
          page_size: 25,
          next: null,
          previous: null,
          results: [],
        });
      }),
    );
    await api('get', '/api/v1/items/', { query: { q: 'hp', page: 2 } });
    expect(seen).toBe('?q=hp&page=2');
  });

  it('turns a 400 body into field errors', async () => {
    const e = await catchError(
      api('post', '/api/v1/auth/login/', { body: { login_id: 'USR-0001', password: '' } }),
    );
    expect(e).toBeInstanceOf(ApiError);
    expect(e).toMatchObject({ status: 400, kind: 'validation', code: 'validation_error' });
    expect(e.fieldError('password')).toBe('This field is required.');
    expect(e.fieldError('login_id')).toBeUndefined();
  });

  it('maps 401', async () => {
    const e = await catchError(api('get', '/api/v1/auth/me/'));
    expect(e).toMatchObject({ status: 401, kind: 'unauthenticated', code: 'not_authenticated' });
  });

  it('maps 403', async () => {
    server.use(
      http.get('/api/v1/users/', () =>
        HttpResponse.json(
          { code: 'permission_denied', message: 'No.', errors: [] },
          { status: 403 },
        ),
      ),
    );
    const e = await catchError(api('get', '/api/v1/users/'));
    expect(e).toMatchObject({ status: 403, kind: 'forbidden', code: 'permission_denied' });
  });

  it('maps 429 with Retry-After', async () => {
    server.use(
      http.post('/api/v1/auth/login/', () =>
        HttpResponse.json(
          { code: 'rate_limited', message: 'Too many tries.', errors: [] },
          { status: 429, headers: { 'Retry-After': '900' } },
        ),
      ),
    );
    const e = await catchError(
      api('post', '/api/v1/auth/login/', { body: { login_id: 'USR-0001', password: 'x' } }),
    );
    expect(e).toMatchObject({ status: 429, kind: 'rate_limited', retryAfter: 900 });
  });

  it('survives a non-standard error body', async () => {
    server.use(
      http.get('/health/', () => new HttpResponse('<html>bad gateway</html>', { status: 502 })),
    );
    const e = await catchError(api('get', '/health/'));
    expect(e).toMatchObject({ status: 502, kind: 'server', code: 'unknown', errors: [] });
  });

  it('reports a network failure', async () => {
    server.use(http.get('/health/', () => HttpResponse.error()));
    expect(await catchError(api('get', '/health/'))).toMatchObject({ kind: 'network' });
  });

  it('sends the Idempotency-Key header', async () => {
    document.cookie = 'csrftoken=abc';
    const key = newIdempotencyKey();
    let seen: string | null = null;
    server.use(
      http.post('/api/v1/dispatches/', ({ request }) => {
        seen = request.headers.get('Idempotency-Key');
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    await api('post', '/api/v1/dispatches/', {
      body: { destination_id: 2, lines: [{ item_id: 1, quantity: 1 }] },
      idempotencyKey: key,
    });
    expect(seen).toBe(key);
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sends credentials, and the CSRF cookie as header on unsafe methods only', async () => {
    document.cookie = 'csrftoken=cookie-token';
    const seen: Record<string, string | null> = {};
    server.use(
      http.get('/api/v1/auth/me/', ({ request }) => {
        seen.getCsrf = request.headers.get('X-CSRFToken');
        return HttpResponse.json({});
      }),
      http.post('/api/v1/auth/logout/', ({ request }) => {
        seen.postCsrf = request.headers.get('X-CSRFToken');
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const spy = vi.spyOn(globalThis, 'fetch');
    await api('get', '/api/v1/auth/me/');
    expect(spy.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
    expect(await api('post', '/api/v1/auth/logout/')).toBeUndefined();
    spy.mockRestore();
    expect(seen).toEqual({ getCsrf: null, postCsrf: 'cookie-token' });
  });

  it('fetches a CSRF token when there is no cookie', async () => {
    let seen: string | null = null;
    server.use(
      http.post('/api/v1/auth/login/', ({ request }) => {
        seen = request.headers.get('X-CSRFToken');
        return HttpResponse.json({});
      }),
    );
    await api('post', '/api/v1/auth/login/', { body: { login_id: 'USR-0001', password: 'x' } });
    expect(seen).toBe('mock-csrf-token');
  });

  it('retries once after a 403 csrf_failed with a refreshed token', async () => {
    document.cookie = 'csrftoken=stale';
    const seen: (string | null)[] = [];
    server.use(
      http.post('/api/v1/auth/logout/', ({ request }) => {
        seen.push(request.headers.get('X-CSRFToken'));
        return seen.length === 1
          ? HttpResponse.json(
              { code: 'csrf_failed', message: 'CSRF token missing or incorrect.', errors: [] },
              { status: 403 },
            )
          : new HttpResponse(null, { status: 204 });
      }),
      http.get('/api/v1/auth/csrf/', () => {
        document.cookie = 'csrftoken=fresh';
        return HttpResponse.json({ csrf_token: 'fresh' });
      }),
    );
    expect(await api('post', '/api/v1/auth/logout/')).toBeUndefined();
    expect(seen).toEqual(['stale', 'fresh']);
  });

  it('retries only once on csrf_failed', async () => {
    document.cookie = 'csrftoken=stale';
    let calls = 0;
    server.use(
      http.post('/api/v1/auth/logout/', () => {
        calls += 1;
        return HttpResponse.json(
          { code: 'csrf_failed', message: 'No.', errors: [] },
          { status: 403 },
        );
      }),
    );
    expect(await catchError(api('post', '/api/v1/auth/logout/'))).toMatchObject({
      status: 403,
      code: 'csrf_failed',
    });
    expect(calls).toBe(2);
  });

  it('does not retry other 403 answers', async () => {
    document.cookie = 'csrftoken=abc';
    let calls = 0;
    server.use(
      http.post('/api/v1/auth/logout/', () => {
        calls += 1;
        return HttpResponse.json(
          { code: 'permission_denied', message: 'No.', errors: [] },
          { status: 403 },
        );
      }),
    );
    await catchError(api('post', '/api/v1/auth/logout/'));
    expect(calls).toBe(1);
  });

  it('shares one CSRF fetch between concurrent first unsafe calls', async () => {
    let csrfFetches = 0;
    server.use(
      http.get('/api/v1/auth/csrf/', async () => {
        csrfFetches += 1;
        await new Promise((r) => setTimeout(r, 20));
        return HttpResponse.json({ csrf_token: 'shared' });
      }),
      http.post('/api/v1/auth/logout/', () => new HttpResponse(null, { status: 204 })),
      http.post('/api/v1/auth/password/', () => new HttpResponse(null, { status: 204 })),
    );
    await Promise.all([
      api('post', '/api/v1/auth/logout/'),
      api('post', '/api/v1/auth/password/', { body: { current_password: 'a', new_password: 'b' } }),
    ]);
    expect(csrfFetches).toBe(1);
  });

  it('ignores error entries that are not objects', async () => {
    server.use(
      http.get('/health/', () =>
        HttpResponse.json(
          {
            code: 'validation_error',
            message: 'Bad.',
            errors: ['oops', null, 7, [1], { field: 'name', message: 'Required.' }],
          },
          { status: 400 },
        ),
      ),
    );
    const e = await catchError(api('get', '/health/'));
    expect(e.errors).toEqual([{ field: 'name', message: 'Required.' }]);
  });
});

describe('Idempotency-Key (contract v0.1.1)', () => {
  it('is sent on keyed calls and the mock accepts them', async () => {
    mockSession.loggedIn = true;
    const brand = await api('post', '/api/v1/brands/', {
      body: { name: 'Lenovo' },
      idempotencyKey: newIdempotencyKey(),
    });
    expect(brand).toMatchObject({ name: 'Lenovo', is_active: true });
  });

  it('is rejected with 400 by the mock when missing, so a client that forgets it is caught', async () => {
    mockSession.loggedIn = true;
    const err = await catchError(
      // @ts-expect-error the type demands idempotencyKey on this operation
      api('post', '/api/v1/brands/', { body: { name: 'Lenovo' } }),
    );
    expect(err).toMatchObject({ status: 400, kind: 'validation' });
  });

  it('is not needed on login, logout or password change', async () => {
    await api('post', '/api/v1/auth/login/', { body: { login_id: 'SA-0001', password: 'x' } });
    await api('post', '/api/v1/auth/password/', {
      body: { current_password: 'x', new_password: 'long-enough-1' },
    });
    await api('post', '/api/v1/auth/logout/');
  });
});
