/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API is called same-origin (`/api/...`): in production the load balancer
// routes that prefix to island-venues-api. Locally, `npm run dev` proxies it to
// API_PROXY_TARGET (default http://localhost:8080) so the browser never needs CORS.
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:8080';
// Local stand-in for IAP: the API in DEV_MODE reads the caller from X-Dev-User.
// Added by the dev proxy only, so it never reaches the production bundle.
const devUser = process.env.DEV_USER;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        ...(devUser ? { headers: { 'X-Dev-User': devUser } } : {}),
      },
    },
  },
  build: {
    outDir: 'dist',
    // Source maps would publish the full source of a staff-only console.
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
    restoreMocks: true,
  },
});
