import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useIdempotencyKey } from './idempotency';

describe('useIdempotencyKey', () => {
  it('resends the same key for the same action and issues a new one when the body changes', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const a = result.current.forAction('{"name":"A"}');
    expect(result.current.forAction('{"name":"A"}')).toBe(a);
    const b = result.current.forAction('{"name":"B"}');
    expect(b).not.toBe(a);
    expect(b).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('starts a fresh key once an action succeeded', () => {
    const { result } = renderHook(() => useIdempotencyKey());
    const a = result.current.forAction('x');
    result.current.done();
    expect(result.current.forAction('x')).not.toBe(a);
  });
});
