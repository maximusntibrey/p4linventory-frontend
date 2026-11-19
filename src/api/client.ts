// Typed API client (F1.4). Types come from the generated `paths` (src/api/schema.gen.ts);
// nothing here is a hand-written API shape and nothing here is a business rule. It only:
//   - sends the session cookie (same origin through the Vite proxy),
//   - echoes the csrftoken cookie in X-CSRFToken on unsafe methods,
//   - sends Idempotency-Key where the contract's operation declares that header,
//   - turns every failure into an ApiError.
import { apiErrorFromResponse, networkApiError } from './errors.ts';
import type { paths } from './schema.gen.ts';

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';
type SuccessStatus = 200 | 201 | 202 | 204;

export type ApiPath = keyof paths;
export type MethodsOf<P extends ApiPath> = {
  [M in HttpMethod]-?: [NonNullable<paths[P][M]>] extends [never] ? never : M;
}[HttpMethod];
type Operation<P extends ApiPath, M extends MethodsOf<P>> = NonNullable<paths[P][M]>;

type ParamsOf<O> = O extends { parameters: infer Q } ? Q : never;
type PathParams<O> = ParamsOf<O> extends { path: infer X } ? X : never;
type QueryParams<O> = ParamsOf<O> extends { query?: infer X } ? NonNullable<X> : never;
type NeedsIdempotencyKey<O> =
  ParamsOf<O> extends { header: { 'Idempotency-Key': unknown } } ? true : false;
type JsonBody<O> = O extends { requestBody: { content: { 'application/json': infer B } } }
  ? B
  : never;
type FormBody<O> = O extends { requestBody: { content: { 'multipart/form-data': unknown } } }
  ? FormData
  : never;

type Required_<K extends string, T> = [T] extends [never]
  ? Partial<Record<K, undefined>>
  : Record<K, T>;
type Optional_<K extends string, T> = [T] extends [never]
  ? Partial<Record<K, undefined>>
  : Partial<Record<K, T>>;

export type RequestOptions<O> = Required_<'path', PathParams<O>> &
  Optional_<'query', QueryParams<O>> &
  Required_<'body', JsonBody<O> | FormBody<O>> &
  (NeedsIdempotencyKey<O> extends true
    ? { idempotencyKey: string }
    : { idempotencyKey?: undefined }) & { signal?: AbortSignal };

export type ResponseData<O> = O extends { responses: infer R }
  ? {
      [S in keyof R & SuccessStatus]: R[S] extends { content: { 'application/json': infer B } }
        ? B
        : undefined;
    }[keyof R & SuccessStatus]
  : never;

type RequestArgs<O> =
  Record<string, never> extends RequestOptions<O>
    ? [options?: RequestOptions<O>]
    : [options: RequestOptions<O>];

/** A fresh UUID for ONE submission. Reuse it when retrying that same submission. */
export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

export interface ApiClientConfig {
  /** Origin prefix; '' (default) = same origin. Contract paths already include /api/v1. */
  baseUrl?: string;
  fetch?: typeof fetch;
  /** Cookie reader; defaults to document.cookie. */
  getCookie?: (name: string) => string | undefined;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const SESSION_PATH = '/api/v1/auth/session/';

function readDocumentCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  for (const part of document.cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

function buildUrl(
  baseUrl: string,
  template: string,
  pathParams: Record<string, string | number> | undefined,
  query: Record<string, string | number | null | undefined> | undefined,
): string {
  const path = template.replace(/\{(\w+)\}/g, (_match, name: string) =>
    encodeURIComponent(String(pathParams?.[name])),
  );
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null) search.append(key, String(value));
  }
  const qs = search.toString();
  return `${baseUrl}${path}${qs ? `?${qs}` : ''}`;
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export function createApiClient(config: ApiClientConfig = {}) {
  const baseUrl = config.baseUrl ?? '';
  const doFetch = config.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const getCookie = config.getCookie ?? readDocumentCookie;

  async function send(
    method: string,
    url: string,
    headers: Record<string, string>,
    body: BodyInit | undefined,
    signal: AbortSignal | undefined,
  ): Promise<Response> {
    try {
      return await doFetch(url, {
        method,
        headers,
        credentials: 'same-origin',
        ...(body === undefined ? {} : { body }),
        ...(signal ? { signal } : {}),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw networkApiError();
    }
  }

  // The contract: GET /auth/session/ sets the csrftoken cookie. Probe once if it is missing.
  async function csrfToken(): Promise<string | undefined> {
    let token = getCookie('csrftoken');
    if (token === undefined) {
      await send(
        'GET',
        `${baseUrl}${SESSION_PATH}`,
        { Accept: 'application/json' },
        undefined,
        undefined,
      );
      token = getCookie('csrftoken');
    }
    return token;
  }

  async function request<P extends ApiPath, M extends MethodsOf<P>>(
    method: M,
    path: P,
    ...args: RequestArgs<Operation<P, M>>
  ): Promise<ResponseData<Operation<P, M>>> {
    const options = (args[0] ?? {}) as {
      path?: Record<string, string | number>;
      query?: Record<string, string | number | null | undefined>;
      body?: unknown;
      idempotencyKey?: string;
      signal?: AbortSignal;
    };
    const verb = method.toUpperCase();
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (!SAFE_METHODS.has(verb)) {
      const token = await csrfToken();
      if (token !== undefined) headers['X-CSRFToken'] = token;
    }
    if (options.idempotencyKey !== undefined) headers['Idempotency-Key'] = options.idempotencyKey;

    let body: BodyInit | undefined;
    if (options.body instanceof FormData) {
      body = options.body; // the browser sets the multipart boundary
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    const url = buildUrl(baseUrl, path, options.path, options.query);
    const response = await send(verb, url, headers, body, options.signal);
    const parsed = await parseBody(response);
    if (!response.ok) throw apiErrorFromResponse(response, parsed);
    return parsed as ResponseData<Operation<P, M>>;
  }

  return { request };
}

export type ApiClient = ReturnType<typeof createApiClient>;
