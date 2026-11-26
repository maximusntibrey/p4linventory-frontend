import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveApiMode } from './index';

describe('apiMode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is mock only when VITE_API_MODE=mock outside production', () => {
    expect(resolveApiMode('mock', false)).toBe('mock');
  });

  it('is real when the mode is unset', () => {
    expect(resolveApiMode('', false)).toBe('real');
  });

  it('is real when VITE_API_MODE=real', () => {
    expect(resolveApiMode('real', false)).toBe('real');
  });

  it('exposes VITE_API_URL with a trailing slash removed', async () => {
    vi.stubEnv('VITE_API_URL', 'https://backend.up.railway.app/');
    const mod = await import('./index');
    expect(mod.apiUrl).toBe('https://backend.up.railway.app');
  });

  it('is real in a production build even with VITE_API_MODE=mock', () => {
    expect(resolveApiMode('mock', true)).toBe('real');
  });

  it('is real in a production build with the mode unset', () => {
    expect(resolveApiMode('', true)).toBe('real');
  });
});
