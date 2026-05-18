# LEADSCOPE — Lead Statistics Dashboard

An editorial, Bloomberg-flavored dashboard for reading lead statistics across
your channels. Built with Vite + React + TypeScript + TailwindCSS + Recharts
+ TanStack Query, against a Firebase Identity Toolkit login and a
`/api/v1/stats/leads` backend endpoint.

```
+---------------------------------------------+
| LEADSCOPE   IKIS · WTS · DX        operator |
|---------------------------------------------|
|  OPERATOR · YOU                              |
|  Today's lead desk.                          |
|  2026-04-28 → 2026-05-05 · day · IKIS·WTS·DX |
|                                              |
|  [ FILTERS · CHANNELS · GROUP BY · RANGE ]   |
|                                              |
|  [ KPI 01 TOTAL ] [ 02 AVG ] [ 03 PEAK ] ... |
|                                              |
|  [ CHART line / bar / stacked          ]     |
|                                              |
|  [ TABLE  period · IKIS · WTS · DX  ↓ CSV ]  |
|                                              |
|  [ DEBUG · raw API response               ]  |
+---------------------------------------------+
```

## Quick start

```bash
npm install
cp .env.example .env       # then edit .env
npm run dev                # http://localhost:5173
```

## Environment variables

The dashboard reads everything from `.env` at build time. Restart `npm run dev`
after editing.

| Variable                 | Required        | Example                          | Notes |
| ------------------------ | --------------- | -------------------------------- | ----- |
| `VITE_BASE_PATH`         | yes (prod)      | `http://172.90.10.13:9910`       | Backend root. In dev it's used as the Vite proxy target. No trailing slash. |
| `VITE_FIREBASE_KEY`      | yes             | `AIzaSy...`                      | Firebase Web API key (Identity Toolkit). |
| `VITE_CLIENT_TYPE`       | no              | `CLIENT_TYPE_WEB`                | Sent as `clientType` in the login body. Defaults to `CLIENT_TYPE_WEB`. |
| `VITE_STATS_PATH_PREFIX` | no              | `/api/v1/stats`                  | Defaults to `/api/v1/stats`. |

## How it works

### Dev proxy (avoids CORS)

When `npm run dev` is running, requests to `/api/...` are transparently
forwarded to `VITE_BASE_PATH` by Vite (`server.proxy` in `vite.config.ts`).
This means the browser hits same-origin `http://localhost:5173/api/...`,
sidestepping the CORS preflight that a private-IP backend like
`http://172.90.10.13:9910` would otherwise fail.

In a **production build** there is no proxy — the browser calls
`VITE_BASE_PATH` directly, so the backend must allow your prod origin via
CORS, or you must serve the app behind a reverse proxy that does the same
forwarding (nginx, Caddy, Cloudflare, etc.).

### Login (Firebase Identity Toolkit)

`POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${VITE_FIREBASE_KEY}`

```json
{
  "returnSecureToken": true,
  "email": "...",
  "password": "...",
  "clientType": "${VITE_CLIENT_TYPE}"
}
```

The returned `idToken` is stored in `localStorage` (`leadscope.auth`) along with
the username (left side of the email) and an estimated expiry timestamp
derived from `expiresIn`. `ProtectedRoute` redirects expired sessions back to
`/login` automatically.

### Statistics fetch

`GET ${VITE_BASE_PATH}${VITE_STATS_PATH_PREFIX}/leads?channelTypes=IKIS,WTS,DX&groupBy=DAY&from=YYYY-MM-DD&to=YYYY-MM-DD`

with `Authorization: Bearer <idToken>`.

The query is managed by TanStack Query, so:

- Filters change → automatic refetch
- Auto-refresh dropdown → `30s / 1m / 5m`
- Manual refresh → button in the filter bar
- 401/403 → session is cleared and you're sent back to `/login`

### Flexible response parser

The actual response shape isn't documented yet, so the parser in
`src/lib/stats.ts` tolerates several shapes:

```jsonc
// A. long-form
{ "data": [{ "date": "2026-04-28", "channelType": "IKIS", "count": 123 }] }

// B. wide-form (already pivoted)
{ "data": [{ "date": "2026-04-28", "IKIS": 123, "WTS": 45, "DX": 67 }] }

// C. grouped by channel
{ "data": [{ "channelType": "IKIS", "series": [{ "date": "...", "count": 9 }] }] }
```

`SECTION E · DEBUG` on the dashboard always shows the raw response — expand it
once your backend is live and adjust the parser if your shape differs.

## Project layout

```
src/
├── App.tsx                  # routes + react-query provider
├── main.tsx
├── index.css                # tailwind + design tokens
├── lib/
│   ├── api.ts               # Firebase login + stats fetcher
│   ├── auth.ts              # zustand store, persisted to localStorage
│   ├── csv.ts               # CSV export
│   ├── env.ts               # env loader + guards
│   ├── format.ts            # number/date formatters
│   ├── stats.ts             # response parser + summary metrics
│   └── types.ts
├── components/
│   ├── DataTable.tsx        # sortable table + per-channel totals
│   ├── DebugPanel.tsx       # raw JSON inspector
│   ├── FilterBar.tsx        # channels, groupBy, date range, auto-refresh
│   ├── Header.tsx           # operator + sys-time + logout
│   ├── KpiCard.tsx          # 4 KPI tiles
│   └── LeadsChart.tsx       # line / bar / stacked switcher
├── pages/
│   ├── DashboardPage.tsx
│   └── LoginPage.tsx
└── routes/
    └── ProtectedRoute.tsx
```

## Scripts

| Script            | What it does                       |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Vite dev server with HMR (`:5173`) |
| `npm run build`   | `tsc -b && vite build`             |
| `npm run preview` | Preview the production build       |
| `npm run lint`    | ESLint on `src/`                   |

## Docker

The repo ships a multi-stage `Dockerfile` (Node build → Nginx serve) plus a
`docker-compose.yml` for convenience.

### Architecture

- **Build stage** (`node:20-alpine`) installs deps and runs `npm run build`.
  `VITE_BASE_PATH` is intentionally empty in the image so the SPA always
  calls `/api/*` relative to its own origin.
- **Runtime stage** (`nginx:1.27-alpine`) serves the built bundle with:
  - SPA fallback (`try_files … /index.html`) so React Router routes work
  - gzip + long-cache headers for `/assets/*`
  - reverse proxy `/api/*` → `${BACKEND_URL}` (substituted at container start)
  - `/healthz` endpoint for liveness checks

### Quick start (docker compose)

Set up `.env` first (the compose file reads from it), then:

```bash
docker compose up --build      # http://localhost:8080
```

Variables consumed by compose (all optional except the Firebase key):

| Variable                 | Used as | Default |
| ------------------------ | ------- | ------- |
| `VITE_FIREBASE_KEY`      | build-time API key | _empty — must be set_ |
| `VITE_CLIENT_TYPE`       | build-time | `CLIENT_TYPE_WEB` |
| `VITE_STATS_PATH_PREFIX` | build-time | `/api/v1/stats` |
| `VITE_BASE_PATH`         | runtime `BACKEND_URL` for nginx proxy | `http://172.90.10.13:9910` |
| `HOST_PORT`              | host port mapped to container's `8000` | `8080` |

### Manual build / run

```bash
docker build -t leadscope:latest \
  --build-arg VITE_FIREBASE_KEY=AIzaSy... \
  --build-arg VITE_CLIENT_TYPE=CLIENT_TYPE_WEB \
  .

docker run --rm -p 8080:8000 \
  -e BACKEND_URL=http://172.90.10.13:9910 \
  leadscope:latest
```

Then open `http://localhost:8080`. Inside the container nginx listens on
`8000` to match Koyeb's default service port; the `-p 8080:8000` maps
`localhost:8080` → container `8000`.

### Switching backends without rebuilding

Because the backend host is a **runtime** env var, the same image can be
deployed against staging / prod by just changing `BACKEND_URL`:

```bash
docker run --rm -p 8080:8000 \
  -e BACKEND_URL=https://staging.your-domain.com \
  leadscope:latest
```

## Runtime configuration

In production the SPA reads configuration at **container start**, not at
build time. This means the same image deploys to every environment — only
the env vars on the platform change.

How it works:

1. The container entrypoint runs `docker/40-write-config-js.sh`, which
   renders `/usr/share/nginx/html/config.js` from env vars.
2. `index.html` loads `/config.js` _before_ the main bundle, so by the time
   the React app boots it can read `window.__APP_CONFIG__`.
3. `src/lib/env.ts` prefers `window.__APP_CONFIG__` and falls back to
   `import.meta.env.VITE_*` (used in `npm run dev` only).
4. nginx serves `/config.js` with `Cache-Control: no-store` so a redeploy
   with a different value takes effect immediately.

## Deploying on Koyeb

Koyeb builds the Dockerfile straight from your Git repo. Because all
configuration is runtime, you only need **one** section:

### Environment variables (the only thing you set)

`Service settings → Environment variables and files`

| Name                     | Value (example)                              |
| ------------------------ | -------------------------------------------- |
| `VITE_FIREBASE_KEY`      | `AIzaSyA6xvEC1_IGN6DZGPvTkzzV5WZfvdarta8`    |
| `VITE_CLIENT_TYPE`       | `CLIENT_TYPE_WEB`                            |
| `VITE_STATS_PATH_PREFIX` | `/api/v1/stats`                              |
| `BACKEND_URL`            | `http://172.90.10.13:9910`                   |

> **Do not** set `VITE_BASE_PATH`. The SPA always calls `/api/*` relative
> to its own origin and nginx forwards to `BACKEND_URL`. That's the whole
> point of the runtime-config setup: switching backends never requires a
> rebuild.

### Health check

`Settings → Health checks`

- Protocol: HTTP, Path: `/healthz`, Port: `8000` (the container default)

### Ports

`Settings → Ports`

- Container port: `8000` — already exposed by the image; nothing to change.

### Networking note

`http://172.90.10.13:9910` is a **private/VPN-only IP**. Koyeb's public
runtime cannot reach it. Options:

- Expose the backend publicly behind HTTPS, then set `BACKEND_URL` to that.
- Use Koyeb's private networking and deploy the SPA on the same network.

### Mapping `.env` → Koyeb

| Var name (in `.env` locally) | Where it goes on Koyeb |
| ---------------------------- | ---------------------- |
| `VITE_FIREBASE_KEY`          | Environment variables  |
| `VITE_CLIENT_TYPE`           | Environment variables  |
| `VITE_STATS_PATH_PREFIX`     | Environment variables  |
| `VITE_BASE_PATH`             | **Skip** — use `BACKEND_URL` instead |

### Common Koyeb errors

- `tsc … error TS6133: '…' is declared but its value is never read` — unused
  code in `src/`. Run `npm run build` locally before pushing; Vite's dev
  server doesn't run `tsc`.
- `TCP health check failed on port 8000` — the container couldn't bind. Make
  sure you didn't override `PORT` to a different value than the one in the
  Ports config.
- `failed to configure registry cache importer` — harmless; just means
  there wasn't a cached build to import.

## Design notes

- **Aesthetic:** editorial dark — Bloomberg desk meets a printed magazine.
  Display type is **Fraunces**, body is **Inter Tight**, numerics are
  **JetBrains Mono** with tabular figures.
- **Accent:** neon lime `#c8ff00` reserved for active state, KPI emphasis,
  and the live-dot.
- **Sections** are tagged like a print magazine (`SECTION A · LOGIN`,
  `SECTION B · FILTERS`, etc.) for hierarchy.
- All numeric values use tabular figures so columns align cleanly.

## Troubleshooting

- **"VITE_FIREBASE_KEY chưa được thiết lập"** → fill `.env` and restart dev.
- **CORS errors in dev** → the dev proxy should prevent these. Confirm the
  request URL starts with `/api` (not the absolute backend URL) and that
  `VITE_BASE_PATH` is set. Restart `npm run dev` after editing `.env`.
- **Cannot reach `172.90.10.13:9910`** → that's a private-network IP. You
  must be on the same LAN / VPN as the backend.
- **`ECONNREFUSED` from the proxy** → the backend is down or unreachable from
  your machine. Try `curl http://172.90.10.13:9910/api/v1/stats/leads?...`
  directly to confirm reachability.
- **Empty chart** → expand `SECTION E · DEBUG` to see the raw response and
  update `parseStats()` in `src/lib/stats.ts` to match your shape.

