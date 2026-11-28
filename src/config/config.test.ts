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

  it('in dev goes through the proxy (same-origin) even when VITE_API_URL is set', async () => {
    vi.stubEnv('VITE_API_URL', 'https://backend.up.railway.app/');
    const mod = await import('./index');
    expect(mod.apiUrl).toBeUndefined();
  });

  it('in dev calls VITE_API_URL cross-origin only when VITE_API_DIRECT=true, trailing slash removed', async () => {
    vi.stubEnv('VITE_API_URL', 'https://backend.up.railway.app/');
    vi.stubEnv('VITE_API_DIRECT', 'true');
    const mod = await import('./index');
    expect(mod.apiUrl).toBe('https://backend.up.railway.app');
  });

  it('in a production build uses VITE_API_URL', async () => {
    vi.stubEnv('PROD', true);
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
