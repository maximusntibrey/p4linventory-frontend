import { defineConfig } from '@playwright/test';

const MOCK = 'http://localhost:5174';

export default defineConfig({
  testDir: 'e2e',
  webServer: [
    {
      command: 'npm run build && npm run preview -- --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      // Mock mode (MSW from the contract copy): the dev server with the in-browser mock API.
      command: 'npx vite --port 5174 --strictPort',
      url: MOCK,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { VITE_API_MODE: 'mock' },
    },
  ],
  use: { baseURL: 'http://localhost:4173' },
  projects: [
    {
      name: 'phone-360',
      testIgnore: /mock-.*\.spec\.ts/,
      use: { browserName: 'chromium', viewport: { width: 360, height: 740 } },
    },
    {
      // First width on the desktop side of the breakpoint (md = 768 px): sidebar layout must still fit.
      name: 'tablet-768',
      testMatch: /(shell|design-system)\.spec\.ts/,
      use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'desktop',
      testIgnore: /mock-.*\.spec\.ts/,
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mock-desktop',
      testMatch: /mock-.*\.spec\.ts/,
      testIgnore: /mock-compact\.spec\.ts/,
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 }, baseURL: MOCK },
    },
    {
      name: 'mock-phone-360',
      testMatch: /mock-(audit|compact|routes|branch|links).*\.spec\.ts/,
      use: { browserName: 'chromium', viewport: { width: 360, height: 740 }, baseURL: MOCK },
    },
  ],
});
