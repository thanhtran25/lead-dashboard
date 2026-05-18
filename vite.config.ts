import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backend = (env.VITE_BASE_PATH ?? '').replace(/\/$/, '')
  const statsPrefix = env.VITE_STATS_PATH_PREFIX || '/api/v1/stats'
  // Proxy the root of the stats prefix (e.g. /api). We strip /v1 to keep
  // the path through the proxy identical to the upstream path.
  const proxyRoot = '/' + statsPrefix.split('/').filter(Boolean)[0]

  const proxy = backend
    ? {
        [proxyRoot]: {
          target: backend,
          changeOrigin: true,
          secure: false,
        },
      }
    : undefined

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy,
    },
  }
})
