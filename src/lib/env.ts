interface AppEnv {
  /** Absolute backend URL — only used when the dev proxy is not in effect. */
  basePath: string
  firebaseKey: string
  clientType: string
  statsPathPrefix: string
  /** True when running `npm run dev`. */
  isDev: boolean
}

function read(name: string): string {
  const value = import.meta.env[name as keyof ImportMetaEnv]
  return typeof value === 'string' ? value.trim() : ''
}

export const env: AppEnv = {
  basePath: read('VITE_BASE_PATH').replace(/\/$/, ''),
  firebaseKey: read('VITE_FIREBASE_KEY'),
  clientType: read('VITE_CLIENT_TYPE') || 'CLIENT_TYPE_WEB',
  statsPathPrefix: read('VITE_STATS_PATH_PREFIX') || '/api/v1/stats',
  isDev: Boolean(import.meta.env.DEV),
}

/**
 * In dev we go through the Vite proxy (relative URL), so basePath is not
 * required client-side. In a production build the browser must call the
 * backend directly, so basePath must be set.
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
  if (env.isDev) return null
  if (!env.basePath) return 'VITE_BASE_PATH chưa được thiết lập trong .env'
  return null
}
