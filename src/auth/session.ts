import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api';
import type { components } from '../api';

export type Me = components['schemas']['Me'];
export const meKey = ['me'] as const;

/** The signed-in user as the server describes them; null when there is no session (401). Menu and permissions come from here and nowhere else. */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async (): Promise<Me | null> => {
      try {
        return await api('get', '/api/v1/auth/me/');
      } catch (e) {
        if (e instanceof ApiError && e.kind === 'unauthenticated') return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 30_000,
  });
}

/** Log out on the server, then drop every cached answer so nothing of this user stays in memory. */
export function useLogout(onDone: () => void) {
  const qc = useQueryClient();
  const [error, setError] = useState<string>();
  const m = useMutation({
    mutationFn: () => api('post', '/api/v1/auth/logout/'),
    meta: { keepSession: true },
    onSuccess: () => finish(),
    onError: (e) => {
      // 401 = the session was already gone, which is the state we wanted.
      if (e instanceof ApiError && e.kind === 'unauthenticated') finish();
      else setError('Could not log out. Check your connection and try again.');
    },
  });
  function finish() {
    qc.clear();
    onDone();
  }
  return {
    logout: () => {
      setError(undefined);
      m.mutate();
    },
    pending: m.isPending,
    error,
  };
}
