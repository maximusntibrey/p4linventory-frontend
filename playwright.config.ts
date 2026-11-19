import { defineConfig, devices } from '@playwright/test';

// Playwright (T.22): end-to-end smoke tests against the BUILT app served by
// `vite preview`. Browsers are not committed: install them once with
// `npx playwright install chromium` (CI: `npx playwright install --with-deps chromium`).
// The full end-to-end flow against staging is a later step (FE s8).
const isCI = Boolean(process.env.CI);
const baseURL = 'http://localhost:4173';

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
    {
      name: 'chromium-360',
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: baseURL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
