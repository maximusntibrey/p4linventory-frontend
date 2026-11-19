import { defineConfig, devices } from '@playwright/test';

// Playwright (T.22): end-to-end smoke tests against the BUILT app served by
// `vite preview`. Browsers are not committed: install them once with
// `npx playwright install chromium` (CI: `npx playwright install --with-deps chromium`).
// The full end-to-end flow against staging is a later step (FE s8).
const isCI = Boolean(process.env.CI);
const baseURL = 'http://localhost:4173';
const devURL = 'http://localhost:5173';
const mockURL = 'http://localhost:5174';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: isCI,
  retries: 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    // Production build via `vite preview`.
    {
      name: 'chromium-360',
      testMatch: /smoke.spec.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } },
    },
    // /ui-kit is development only (F1.1), so its checks run against the dev server.
    {
      name: 'chromium-360-dev',
      testMatch: /ui-kit.spec.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 }, baseURL: devURL },
    },
    // Mock mode (F1.4): the dev server started with VITE_API_MODE=mock answers from MSW.
    {
      name: 'chromium-360-mock',
      testMatch: /mock-mode.spec.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 740 },
        baseURL: mockURL,
      },
    },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview',
      url: baseURL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: 'npm run dev',
      url: devURL,
      reuseExistingServer: !isCI,
      timeout: 120_000,
    },
    {
      command: 'npx vite --port 5174 --strictPort',
      url: mockURL,
      env: { VITE_API_MODE: 'mock' },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
