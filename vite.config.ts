/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { buildDevProxy } from './src/config/devProxy.ts';

// Vite (T.17), Tailwind (T.19) and Vitest (T.22) share this file.
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
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
