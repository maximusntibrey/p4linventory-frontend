export type ApiMode = 'mock' | 'real';

/** mock = MSW responses, only when asked for AND never in a production build; everything else = real backend through the /api proxy. */
export const apiMode: ApiMode =
  import.meta.env.VITE_API_MODE === 'mock' && !import.meta.env.PROD ? 'mock' : 'real';
