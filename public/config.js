// Runtime configuration loaded BEFORE the main bundle.
//
// In dev (`npm run dev`) this stub is served as-is; the app falls back to
// reading import.meta.env (i.e. values from .env).
//
// In a Docker / Koyeb deployment, the `/docker-entrypoint.d/40-write-config-js.sh`
// script overwrites this file at container start using env vars set on the
// platform (VITE_FIREBASE_KEY, VITE_CLIENT_TYPE, VITE_STATS_PATH_PREFIX).
window.__APP_CONFIG__ = window.__APP_CONFIG__ || {}
