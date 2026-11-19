// VITE_API_MODE switch (FIX-1): `real` talks to the backend (default), `mock` uses MSW.
export type ApiMode = 'mock' | 'real';

export function resolveApiMode(value: string | undefined): ApiMode {
  return value === 'mock' ? 'mock' : 'real';
}

// `mock` starts the MSW browser worker (src/main.tsx, development only; production builds never
// include it). Handlers: src/mocks/handlers.ts.
export const apiMode: ApiMode = resolveApiMode(import.meta.env.VITE_API_MODE);
