import type { components, paths } from './schema';
import { apiUrl } from '../config';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
type Json<T> = T extends { content: { 'application/json': infer B } } ? B : never;
type Body<O> = O extends { requestBody: infer R } ? Json<R> | FormData : never;
type Ok<O> = O extends { responses: infer R }
  ? R extends { 200: infer S }
    ? Json<S>
    : R extends { 201: infer S }
      ? Json<S>
      : undefined
  : never;
type Query<O> = O extends { parameters: { query?: infer Q } } ? NonNullable<Q> : never;

export type ApiErrorBody = components['schemas']['Error'];
export type FieldError = ApiErrorBody['errors'][number];
export type ApiErrorKind =
  | 'validation'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'too_large'
  | 'rate_limited'
  | 'server'
  | 'network';

const kindByStatus: Record<number, ApiErrorKind> = {
  400: 'validation',
  401: 'unauthenticated',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  413: 'too_large',
  429: 'rate_limited',
};

/** The contract's standard error body as a typed error. The server's `code` is kept as is; the client never interprets it. */
export class ApiError extends Error {
  readonly name = 'ApiError';
  constructor(
    readonly status: number,
    readonly kind: ApiErrorKind,
    readonly code: string,
    message: string,
    readonly errors: FieldError[] = [],
    /** Seconds, from the Retry-After header (429). */
    readonly retryAfter?: number,
  ) {
    super(message);
  }

  /** Message for one request field (dotted for nested, e.g. `lines.0.quantity`), if the server named it. */
  fieldError(field: string): string | undefined {
    return this.errors.find((e) => e.field === field)?.message;
  }
}

/** Required by the contract on every state-changing call except login, logout and password change (v0.1.1). Reuse the same key to retry. The type makes it mandatory exactly where the contract lists the header. */
type KeyOption<O> = O extends { parameters: { header: { 'Idempotency-Key': unknown } } }
  ? { idempotencyKey: string }
  : { idempotencyKey?: string };

export type RequestOptions<O> = {
  path?: Record<string, string | number>;
  query?: Query<O>;
  body?: Body<O>;
  signal?: AbortSignal;
} & KeyOption<O>;

export const newIdempotencyKey = (): string => crypto.randomUUID();

const unsafe = new Set<Method>(['post', 'put', 'patch', 'delete']);
let csrfFallback: string | undefined;
const isMockMode =
  import.meta.env.MODE === 'test' ||
  (import.meta.env.VITE_API_MODE === 'mock' && !import.meta.env.PROD);

function csrfFromCookie(): string | undefined {
  const m = /(?:^|;\s*)csrftoken=([^;]*)/.exec(document.cookie);
  return m ? decodeURIComponent(m[1]) : undefined;
}

let csrfInFlight: Promise<string> | undefined;

/** Ask the server for a token (it also sets the cookie). Calls made while one fetch is running share it. */
function fetchCsrfToken(): Promise<string> {
  csrfInFlight ??= api('get', '/api/v1/auth/csrf/')
    .then((res) => (csrfFallback = res.csrf_token))
    .finally(() => {
      csrfInFlight = undefined;
    });
  return csrfInFlight;
}

async function csrfToken(): Promise<string> {
  return csrfFromCookie() ?? csrfFallback ?? fetchCsrfToken();
}

/** Test hook: forget the cached CSRF token. */
export const resetCsrfCache = () => {
  csrfFallback = undefined;
  csrfInFlight = undefined;
};

async function toApiError(res: Response): Promise<ApiError> {
  let err: Partial<ApiErrorBody> = {};
  try {
    err = (await res.json()) as Partial<ApiErrorBody>;
  } catch {
    // not the standard body (for example a proxy error page)
  }
  const retry = Number(res.headers.get('Retry-After'));
  return new ApiError(
    res.status,
    kindByStatus[res.status] ?? 'server',
    typeof err.code === 'string' ? err.code : 'unknown',
    typeof err.message === 'string' ? err.message : 'Something went wrong.',
    Array.isArray(err.errors)
      ? err.errors.filter((e) => typeof e === 'object' && e !== null && !Array.isArray(e))
      : [],
    retry > 0 ? retry : undefined,
  );
}

export async function api<P extends keyof paths, M extends Method & keyof paths[P]>(
  method: M,
  path: P,
  opts: RequestOptions<paths[P][M]> = {} as RequestOptions<paths[P][M]>,
): Promise<Ok<paths[P][M]>> {
  let url = (path as string).replace(/\{(\w+)\}/g, (_, k: string) =>
    encodeURIComponent(String(opts.path?.[k])),
  );
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries((opts.query ?? {}) as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  if (qs.size) url += `?${qs}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  let body: BodyInit | undefined;
  if (opts.body instanceof FormData) body = opts.body;
  else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers['Content-Type'] = 'application/json';
  }
  if (opts.idempotencyKey) headers['Idempotency-Key'] = opts.idempotencyKey;

  const send = async (token?: string): Promise<Response> => {
    try {
      const requestUrl = isMockMode
        ? new URL(url, globalThis.location.origin)
        : new URL(url, apiUrl || globalThis.location.origin);
      return await fetch(requestUrl, {
        method: method.toUpperCase(),
        headers: token ? { ...headers, 'X-CSRFToken': token } : headers,
        body,
        credentials: 'include',
        signal: opts.signal,
      });
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') throw e;
      throw new ApiError(0, 'network', 'network_error', 'Could not reach the server.');
    }
  };

  let token = unsafe.has(method) ? await csrfToken() : undefined;
  let res = await send(token);
  let failure = res.ok ? undefined : await toApiError(res);
  // A stale token is the one failure worth one automatic retry: refresh the token, send again.
  if (token && failure?.status === 403 && failure.code === 'csrf_failed') {
    csrfFallback = undefined;
    token = await fetchCsrfToken();
    res = await send(token);
    failure = res.ok ? undefined : await toApiError(res);
  }
  if (failure) throw failure;
  return (res.status === 204 ? undefined : await res.json()) as Ok<paths[P][M]>;
}

export type CsvExport = { text: string; truncated: boolean };

/** GET a CSV export (the contract's text/csv operations). `X-Export-Truncated: true` means more rows matched than were sent. */
export async function apiCsv(
  path: '/api/v1/activity-log/export/',
  query: Query<paths['/api/v1/activity-log/export/']['get']> = {},
): Promise<CsvExport> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query as Record<string, unknown>)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const target = `${path}${qs.size ? `?${qs}` : ''}`;
  let res: Response;
  try {
    res = await fetch(new URL(target, (!isMockMode && apiUrl) || globalThis.location.origin), {
      headers: { Accept: 'text/csv' },
      credentials: 'include',
    });
  } catch {
    throw new ApiError(0, 'network', 'network_error', 'Could not reach the server.');
  }
  if (!res.ok) throw await toApiError(res);
  return { text: await res.text(), truncated: res.headers.get('X-Export-Truncated') === 'true' };
}
