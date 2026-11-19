// Vite dev-server proxy (FIX-1). In development the browser talks only to the Vite origin
// (http://localhost:5173); these paths are forwarded to the backend, so the session and CSRF
// cookies are same-origin and no CORS set-up is needed locally. Never used in production builds.
export const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8000';

export const PROXIED_PATHS = ['/api', '/health', '/admin', '/static'] as const;

export interface DevProxyEntry {
  target: string;
  changeOrigin: boolean;
  cookieDomainRewrite: string;
  configure: (proxy: {
    on: (
      event: 'proxyReq',
      cb: (req: { setHeader: (k: string, v: string) => void }) => void,
    ) => void;
  }) => void;
}

export function resolveBackendUrl(value: string | undefined): string {
  const trimmed = (value ?? '').trim().replace(/\/+$/, '');
  return trimmed === '' ? DEFAULT_BACKEND_URL : trimmed;
}

export function buildDevProxy(backendUrl: string | undefined): Record<string, DevProxyEntry> {
  const target = resolveBackendUrl(backendUrl);
  const entry: DevProxyEntry = {
    target,
    changeOrigin: true,
    // Cookies set by the backend belong to the Vite origin; drop any Domain attribute.
    cookieDomainRewrite: '',
    // Django's CSRF check compares Origin with the backend host: make them agree.
    configure: (proxy) => {
      proxy.on('proxyReq', (req) => {
        req.setHeader('origin', target);
      });
    },
  };
  return Object.fromEntries(PROXIED_PATHS.map((path) => [path, entry]));
}
