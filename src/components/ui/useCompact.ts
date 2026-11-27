import { useSyncExternalStore } from 'react';

/** Below the tablet breakpoint (Tailwind md, 48rem). Keep in step with the density block in tokens.css. */
const QUERY = '(max-width: 47.99rem)';

const subscribe = (cb: () => void) => {
  const m = window.matchMedia?.(QUERY);
  m?.addEventListener('change', cb);
  return () => m?.removeEventListener('change', cb);
};

/** True on phones. Without matchMedia (tests) it is false, so the desktop layout renders. */
export const useCompact = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(QUERY).matches ?? false,
    () => false,
  );
