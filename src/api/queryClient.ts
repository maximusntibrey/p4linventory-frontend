import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { meKey } from '../auth/session';
import { ApiError } from './client';

/** Cache key that says "the session ended on its own" (a later 401); the guard passes it to the login screen. */
export const sessionEndedKey = ['session-ended'] as const;

/**
 * The one QueryClient (the app and the tests both build it here). A 401 on any call after sign-in
 * means the session is gone: the me answer becomes null and the guard sends the user to login.
 * Calls marked `meta: { keepSession: true }` (login, logout) handle their own 401.
 */
export function createQueryClient(defaults?: ConstructorParameters<typeof QueryClient>[0]) {
  const client: QueryClient = new QueryClient({
    ...defaults,
    queryCache: new QueryCache({ onError: (e, q) => expired(e, q.meta) }),
    mutationCache: new MutationCache({ onError: (e, _v, _c, m) => expired(e, m.meta) }),
  });
  function expired(e: unknown, meta?: Record<string, unknown>) {
    if (!(e instanceof ApiError) || e.kind !== 'unauthenticated' || meta?.keepSession) return;
    client.setQueryData(sessionEndedKey, true);
    client.setQueryData(meKey, null);
  }
  return client;
}
