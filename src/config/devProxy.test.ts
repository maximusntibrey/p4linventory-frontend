import { describe, expect, it } from 'vitest';
import { buildDevProxy, DEFAULT_BACKEND_URL, resolveBackendUrl } from './devProxy';
import { resolveApiMode } from './apiMode';

describe('dev proxy', () => {
  it('proxies /api, /health, /admin and /static to VITE_BACKEND_URL with changeOrigin', () => {
    const proxy = buildDevProxy('http://127.0.0.1:9000/');
    expect(Object.keys(proxy).sort()).toEqual(['/admin', '/api', '/health', '/static']);
    for (const entry of Object.values(proxy)) {
      expect(entry.target).toBe('http://127.0.0.1:9000');
      expect(entry.changeOrigin).toBe(true);
    }
  });

  it('defaults to http://127.0.0.1:8000', () => {
    expect(resolveBackendUrl(undefined)).toBe(DEFAULT_BACKEND_URL);
    expect(resolveBackendUrl('  ')).toBe('http://127.0.0.1:8000');
  });

  it('rewrites Origin to the backend so Django CSRF accepts proxied writes', () => {
    const headers: Record<string, string> = {};
    const api = buildDevProxy(undefined)['/api'];
    expect(api).toBeDefined();
    api?.configure({
      on: (_event, cb) => {
        cb({
          setHeader: (k, v) => {
            headers[k] = v;
          },
        });
      },
    });
    expect(headers.origin).toBe('http://127.0.0.1:8000');
  });
});

describe('API mode', () => {
  it('defaults to real and accepts mock', () => {
    expect(resolveApiMode(undefined)).toBe('real');
    expect(resolveApiMode('bogus')).toBe('real');
    expect(resolveApiMode('mock')).toBe('mock');
  });
});
