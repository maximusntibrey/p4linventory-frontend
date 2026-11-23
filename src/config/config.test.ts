import { afterEach, describe, expect, it, vi } from 'vitest';

describe('apiMode', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is mock only when VITE_API_MODE=mock outside production', async () => {
    vi.stubEnv('VITE_API_MODE', 'mock');
    vi.stubEnv('PROD', false);
    expect((await import('./index')).apiMode).toBe('mock');
  });

  it('is real when the mode is unset', async () => {
    vi.stubEnv('VITE_API_MODE', '');
    vi.stubEnv('PROD', false);
    expect((await import('./index')).apiMode).toBe('real');
  });

  it('is real when VITE_API_MODE=real', async () => {
    vi.stubEnv('VITE_API_MODE', 'real');
    expect((await import('./index')).apiMode).toBe('real');
  });

  it('is real in a production build even with VITE_API_MODE=mock', async () => {
    vi.stubEnv('VITE_API_MODE', 'mock');
    vi.stubEnv('PROD', true);
    expect((await import('./index')).apiMode).toBe('real');
  });

  it('is real in a production build with the mode unset', async () => {
    vi.stubEnv('VITE_API_MODE', '');
    vi.stubEnv('PROD', true);
    expect((await import('./index')).apiMode).toBe('real');
  });
});
