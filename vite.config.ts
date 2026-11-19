/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { rmSync } from 'node:fs';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import { buildDevProxy } from './src/config/devProxy.ts';

// MSW's worker lives in public/ so `msw` mock mode works in dev, but Vite copies public/ into dist/.
// Mocks must never reach production (F1.4), so the build removes the copy; check-dist verifies it.
function dropMswWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'drop-msw-worker',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      rmSync(`${outDir}/mockServiceWorker.js`, { force: true });
    },
  };
}

// Vite (T.17), Tailwind (T.19) and Vitest (T.22) share this file.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), dropMswWorker()],
  server: {
    port: 5173,
    strictPort: true,
    // FIX-1: one origin locally. Backend URL comes from VITE_BACKEND_URL (.env.local).
    proxy: buildDevProxy(loadEnv(mode, process.cwd(), 'VITE_').VITE_BACKEND_URL),
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
  },
}));
