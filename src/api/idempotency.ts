import { useRef } from 'react';
import { newIdempotencyKey } from './client';

/**
 * One Idempotency-Key per user action (contract v0.1.1). The same action (same `signature`) retried
 * after a failure resends the same key; a changed body gets a new key (a changed body under an old key is a 409).
 * Call `done()` after success so the next action starts fresh.
 */
export function useIdempotencyKey() {
  const last = useRef<{ signature: string; key: string }>(undefined);
  return {
    forAction(signature: string): string {
      if (last.current?.signature !== signature) {
        last.current = { signature, key: newIdempotencyKey() };
      }
      return last.current.key;
    },
    done() {
      last.current = undefined;
    },
  };
}
