import { defineConfig } from '@playwright/test';

/**
 * Real-API project: the browser at http://localhost:5173 calls the backend at http://localhost:8000
 * cross-origin, exactly like production, so CORS preflights are exercised. Not part of `npm run e2e`.
 * Needs the local backend running (docker compose up) and E2E_* passwords in the environment.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: /real-.*\.spec\.ts/,
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
    env: { VITE_API_MODE: 'real', VITE_API_URL: 'http://localhost:8000' },
  },
  use: { baseURL: 'http://localhost:5173' },
  projects: [
    { name: 'real-api', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
});
