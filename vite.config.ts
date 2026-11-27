import { rmSync } from 'node:fs';
import { loadEnv, type Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/** The MSW worker script is for dev and mock mode only: remove it from production output. */
function dropMockWorker(): Plugin {
  return {
    name: 'drop-mock-worker',
    apply: 'build',
    closeBundle() {
      rmSync('dist/mockServiceWorker.js', { force: true });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_API_URL || env.VITE_BACKEND_URL;
  return {
    plugins: [react(), dropMockWorker()],
    // Mantis import style: bare paths from src/ (tsconfig baseUrl), e.g. 'components/MainCard'.
    resolve: { tsconfigPaths: true },
    server: { proxy: { '/api': target, '/media': target, '/health': target } },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
      setupFiles: ['src/test/setup.ts'],
      css: false,
      maxWorkers: 2,
      testTimeout: 15000,
    },
  };
});
