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
    build: {
      rollupOptions: {
        output: {
          // Vendor chunks cache across releases and keep the entry small.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@mui/x-charts') || id.includes('d3-')) return 'charts';
            if (id.includes('@mui') || id.includes('@emotion')) return 'mui';
            if (id.includes('@ant-design')) return 'icons';
            if (id.includes('react-router') || id.includes('@tanstack')) return 'app-vendor';
            return undefined;
          },
        },
      },
    },
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
