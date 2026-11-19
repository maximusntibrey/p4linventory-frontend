/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `real` (default) uses the backend through the dev proxy; `mock` is wired up with MSW in F1.4. */
  readonly VITE_API_MODE?: 'mock' | 'real';
  /** Base URL of the API. Relative by default so the dev proxy keeps one origin. */
  readonly VITE_API_BASE_URL?: string;
  /** Dev-server proxy target (read by vite.config.ts, not exposed to the browser). */
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_ENVIRONMENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
