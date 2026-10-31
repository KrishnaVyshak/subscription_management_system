import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const here = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // One .env at the repo root; only VITE_* vars reach the browser.
  envDir: '..',
  resolve: {
    alias: { '@': path.join(here, 'src') },
  },
  server: {
    port: 5173,
    // Lets Cloudflare quick tunnels (`cloudflared tunnel --url`) reach the dev server.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      // API_PROXY_TARGET points the dev server at another API instance (e.g. a second backend).
      '/api': process.env.API_PROXY_TARGET || 'http://localhost:4000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
});
