/**
 * App-wide configuration.
 *
 * Two sources are supported, in priority order:
 *
 * 1. **Runtime config** — `window.__APP_CONFIG__`, injected by a tiny
 *    `/config.js` file that the Docker entrypoint writes from platform env
 *    vars at container start. This is the source of truth in production.
 *
 * 2. **Build-time config** — `import.meta.env.VITE_*` from `.env`, baked
 *    into the bundle by Vite. This is used in local `npm run dev` and as
 *    a fallback when the runtime file is empty.
 *
 * The same image can therefore be deployed to many environments without a
 * rebuild — just change the platform's env vars and restart.
 */

interface RuntimeConfig {
  firebaseKey?: string
  clientType?: string
  statsPathPrefix?: string
  basePath?: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: RuntimeConfig
  }
}

interface AppEnv {
  /** Absolute backend URL — only used when the dev proxy is not in effect. */
  basePath: string
  firebaseKey: string
  clientType: string
  statsPathPrefix: string
  /** True when running `npm run dev`. */
  isDev: boolean
}

function readRuntime(name: keyof RuntimeConfig): string {
  if (typeof window === 'undefined') return ''
  const v = window.__APP_CONFIG__?.[name]
  return typeof v === 'string' ? v.trim() : ''
}

function readBuild(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv]
  return typeof value === 'string' ? value.trim() : ''
}

function pick(runtimeKey: keyof RuntimeConfig, buildKey: string): string {
  return readRuntime(runtimeKey) || readBuild(buildKey)
}

export const env: AppEnv = {
  basePath: pick('basePath', 'VITE_BASE_PATH').replace(/\/$/, ''),
  firebaseKey: pick('firebaseKey', 'VITE_FIREBASE_KEY'),
  clientType: pick('clientType', 'VITE_CLIENT_TYPE') || 'CLIENT_TYPE_WEB',
  statsPathPrefix:
    pick('statsPathPrefix', 'VITE_STATS_PATH_PREFIX') || '/api/v1/stats',
  isDev: Boolean(import.meta.env.DEV),
}

// Surface a mixed-content warning early — browsers silently drop HTTP
// requests fired from an HTTPS page, so the user sees only opaque
// `TypeError: Failed to fetch` errors otherwise.
if (
  typeof window !== 'undefined' &&
  env.basePath.startsWith('http://') &&
  window.location.protocol === 'https:'
) {
  // eslint-disable-next-line no-console
  console.warn(
    `[LeadScope] basePath is HTTP (${env.basePath}) but this page is HTTPS. ` +
      `Browsers will BLOCK these requests as mixed content. ` +
      `Host the SPA over HTTP, or point basePath at an HTTPS backend.`,
  )
}

/**
 * Where the SPA should send `/api/v1/stats/*` requests.
 *
 * - **Dev:** always relative — the Vite proxy in `vite.config.ts` forwards
 *   `/api/*` to the backend.
 * - **Prod, basePath set:** absolute URL — browser hits the backend
 *   directly. Useful when the backend is reachable from the user's network
 *   and the SPA is hosted on the same protocol (HTTP→HTTP). Will fail with
 *   "mixed content" if the SPA is HTTPS and the backend is HTTP.
 * - **Prod, basePath empty:** relative — nginx in the container forwards
 *   `/api/*` to whatever `BACKEND_URL` is set to. The classic reverse proxy.
 */
export function statsBaseUrl(): string {
  if (env.isDev) return ''
  return env.basePath
}

export function assertEnvForLogin(): string | null {
  if (!env.firebaseKey)
    return 'VITE_FIREBASE_KEY chưa được thiết lập trong .env'
  return null
}

export function assertEnvForApi(): string | null {
  // No client-side base path is required — nginx (or the Vite dev proxy)
  // handles upstream routing.
  return null
}
