export type ApiMode = 'mock' | 'real';

export const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)
  ?.trim()
  .replace(/\/$/, '');

export const resolveApiMode = (mode: string | undefined, production: boolean): ApiMode =>
  mode === 'mock' && !production ? 'mock' : 'real';

/** mock = MSW responses, only when asked for AND never in a production build; everything else = real backend. */
export const apiMode: ApiMode = resolveApiMode(
  import.meta.env.VITE_API_MODE,
  Boolean(import.meta.env.PROD),
);
