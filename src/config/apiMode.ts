// VITE_API_MODE switch (FIX-1): `real` talks to the backend (default), `mock` uses MSW.
export type ApiMode = 'mock' | 'real';

export function resolveApiMode(value: string | undefined): ApiMode {
  return value === 'mock' ? 'mock' : 'real';
}

// TODO(F1.4): when MSW handlers exist, start the browser worker in src/main.tsx if
// `apiMode === 'mock'`. Nothing is mocked until then; `mock` currently behaves like `real`.
export const apiMode: ApiMode = resolveApiMode(import.meta.env.VITE_API_MODE);
