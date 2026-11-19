import { createApiClient } from './client.ts';
import { originOf } from './origin.ts';

export * from './client.ts';
export * from './errors.ts';
export type { components, paths } from './schema.gen.ts';

export const api = createApiClient({
  baseUrl: originOf(
    import.meta.env.VITE_API_BASE_URL,
    (globalThis as { location?: Location }).location?.origin ?? '',
  ),
});
