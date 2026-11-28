export type ApiMode = 'mock' | 'real';

const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim().replace(/\/$/, '');

/**
 * Where the browser sends API calls. Production builds: VITE_API_URL (the backend's public origin).
 * `vite serve`: same-origin by default, so calls go through the Vite proxy and need no CORS;
 * set VITE_API_DIRECT=true to call VITE_API_URL cross-origin instead (the way production does).
 */
export const apiUrl: string | undefined =
  import.meta.env.PROD || import.meta.env.VITE_API_DIRECT === 'true' ? configured : undefined;

export const resolveApiMode = (mode: string | undefined, production: boolean): ApiMode =>
  mode === 'mock' && !production ? 'mock' : 'real';

/** mock = MSW responses, only when asked for AND never in a production build; everything else = real backend. */
export const apiMode: ApiMode = resolveApiMode(
  import.meta.env.VITE_API_MODE,
  Boolean(import.meta.env.PROD),
);
