import { createApiClient } from './client.ts';

export * from './client.ts';
export * from './errors.ts';
export type { components, paths } from './schema.gen.ts';

// An absolute VITE_API_BASE_URL (production) gives the origin; a relative one (local, through
// the Vite proxy) means same origin. Contract paths already carry the /api/v1 prefix.
function originOf(value: string | undefined): string {
  if (value && /^https?:\/\//.test(value)) return new URL(value).origin;
  return '';
}

export const api = createApiClient({ baseUrl: originOf(import.meta.env.VITE_API_BASE_URL) });
