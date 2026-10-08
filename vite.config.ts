import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev only: catalog-service doesn't send CORS headers, so the
    // browser blocks direct fetch() calls to it even though the server
    // itself responds fine (confirmed via curl). Proxying through Vite's
    // dev server keeps the request server-to-server, which isn't subject
    // to browser CORS. Point VITE_CATALOG_SERVICE_URL at '/api/catalog' in
    // .env when running against a local `kubectl port-forward`. Extend
    // this per-service as more clients get wired up (see the backlog item
    // on local-k8s dev wiring).
    proxy: {
      '/api/catalog': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/catalog/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
