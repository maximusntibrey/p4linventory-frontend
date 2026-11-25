export type ApiMode = 'mock' | 'real';

export const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)
  ?.trim()
  .replace(/\/$/, '');

/** mock = MSW responses, only when asked for AND never in a production build; everything else = real backend through the /api proxy. */
export const apiMode: ApiMode =
  import.meta.env.VITE_API_MODE === 'mock' && !import.meta.env.PROD ? 'mock' : 'real';
