import { defineConfig } from '@playwright/test';

/**
 * Real-API project against the local backend (docker compose up, http://localhost:8000). Not part of `npm run e2e`.
 * - default (`npm run e2e:real`): dev server, same-origin calls through the Vite proxy, like `npm run dev`.
 * - `E2E_DIRECT=1` (`npm run e2e:real:direct`): the browser at http://localhost:5173 calls
 *   http://localhost:8000 cross-origin, like production, so CORS preflights are exercised.
 * Passwords come from E2E_* environment variables.
 */
const direct = process.env.E2E_DIRECT === '1';
// 5173 in both modes: it is the origin the backend's CSRF and CORS settings trust.
const port = 5173;
const base = `http://localhost:${port}`;

export default defineConfig({
  testDir: 'e2e',
  testMatch: /real-.*\.spec\.ts/,
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  webServer: {
    command: `npx vite --port ${port} --strictPort`,
    url: base,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      VITE_API_MODE: 'real',
      VITE_API_URL: 'http://localhost:8000',
      VITE_BACKEND_URL: 'http://localhost:8000',
      VITE_API_DIRECT: direct ? 'true' : 'false',
    },
  },
  use: { baseURL: base },
  projects: [
    { name: 'real-api', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
});
