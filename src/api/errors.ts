// Typed error for every failed API call (FE s9: messages come from the API error).
// This file maps shapes only; it decides nothing about what the user may do.
import type { components } from './schema.gen.ts';

export type ApiErrorBody = components['schemas']['Error'];
export type ApiFieldError = components['schemas']['ErrorDetail'];

// What went wrong, from the HTTP status and the contract's error code. Screens branch on this.
export type ApiErrorKind =
  | 'validation' // 400: errors[] names each field at fault
  | 'unauthenticated' // 401: not signed in or session expired -> login with a clear message
  | 'password_change_required' // 403 with code password_change_required -> change-password screen
  | 'forbidden' // 403 any other code
  | 'not_found' // 404
  | 'conflict' // 409: state conflict, including insufficient stock (errors[].code)
  | 'rate_limited' // 429: login lock, see retryAfterSeconds
  | 'network' // the request never got an answer
  | 'unknown'; // any other status, or a body that is not the standard shape

export const PASSWORD_CHANGE_REQUIRED_CODE = 'password_change_required';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: readonly ApiFieldError[];
  readonly requestId: string | undefined;
  readonly retryAfterSeconds: number | undefined;

  constructor(init: {
    kind: ApiErrorKind;
    status: number;
    code: string;
    message: string;
    fieldErrors?: readonly ApiFieldError[];
    requestId?: string | undefined;
    retryAfterSeconds?: number | undefined;
  }) {
    super(init.message);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.code = init.code;
    this.fieldErrors = init.fieldErrors ?? [];
    this.requestId = init.requestId;
    this.retryAfterSeconds = init.retryAfterSeconds;
  }

  /** Messages for one form field (names as in the request body, e.g. `lines[0].quantity`). */
  messagesFor(field: string): string[] {
    return this.fieldErrors.filter((e) => e.field === field).map((e) => e.message);
  }
}

function kindFor(status: number, code: string): ApiErrorKind {
  switch (status) {
    case 400:
      return 'validation';
    case 401:
      return 'unauthenticated';
    case 403:
      return code === PASSWORD_CHANGE_REQUIRED_CODE ? 'password_change_required' : 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 429:
      return 'rate_limited';
    default:
      return 'unknown';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseFieldErrors(value: unknown): ApiFieldError[] {
  if (!Array.isArray(value)) return [];
  const result: ApiFieldError[] = [];
  for (const entry of value as unknown[]) {
    if (
      isRecord(entry) &&
      typeof entry.field === 'string' &&
      typeof entry.code === 'string' &&
      typeof entry.message === 'string'
    ) {
      result.push({ field: entry.field, code: entry.code, message: entry.message });
    }
  }
  return result;
}

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_MESSAGE = 'We could not reach the server. Check the connection and try again.';

/** Builds the typed error from a failed response and its already-parsed body (or undefined). */
export function apiErrorFromResponse(response: Response, body: unknown): ApiError {
  const retryAfter = Number(response.headers.get('Retry-After'));
  const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;
  if (isRecord(body) && typeof body.code === 'string' && typeof body.message === 'string') {
    return new ApiError({
      kind: kindFor(response.status, body.code),
      status: response.status,
      code: body.code,
      message: body.message,
      fieldErrors: parseFieldErrors(body.errors),
      requestId: typeof body.request_id === 'string' ? body.request_id : undefined,
      retryAfterSeconds,
    });
  }
  return new ApiError({
    kind: kindFor(response.status, ''),
    status: response.status,
    code: 'unknown',
    message: FALLBACK_MESSAGE,
    retryAfterSeconds,
  });
}

export function networkApiError(): ApiError {
  return new ApiError({
    kind: 'network',
    status: 0,
    code: 'network_error',
    message: NETWORK_MESSAGE,
  });
}
