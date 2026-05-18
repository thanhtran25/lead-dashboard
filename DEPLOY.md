# Deploy as static files (no Docker, no Koyeb)

This is the simplest possible deployment: build the SPA, then drop the
output folder onto any HTTP server on the **KISVN internal network**.

## How it works

```
                  KISVN LAN (private network)
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌──────────────────────┐         ┌──────────────────────────┐  │
│  │  Static HTTP server  │         │  Backend                 │  │
│  │  http://lan-host:8080│         │  http://172.90.10.13:9910│  │
│  │  serves dist/        │         │                          │  │
│  └─────────┬────────────┘         └────────────┬─────────────┘  │
│            │                                   │                 │
│            │ 1) open in browser                │ 2) fetch        │
│            ▼                                   ▼                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  User's browser (also on the LAN)                        │   │
│  │  - loads SPA from lan-host:8080                          │   │
│  │  - JS calls 172.90.10.13:9910 directly (same network)    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Both the page and the API are plain HTTP on the same LAN — no mixed
content, no CORS preflight (because the backend already accepts the request
from a same-network origin, see note below if you hit CORS), no proxy.

## One-time setup

1. Edit `.env` so the values match the backend you want to call:

   ```env
   VITE_BASE_PATH=http://172.90.10.13:9910
   VITE_FIREBASE_KEY=AIzaSy...
   VITE_CLIENT_TYPE=CLIENT_TYPE_WEB
   VITE_STATS_PATH_PREFIX=/api/v1/stats
   ```

2. Build:

   ```bash
   npm install   # first time only
   npm run build
   ```

   That produces a `dist/` folder containing 5–10 files (HTML + hashed JS +
   CSS). The backend URL and Firebase key are now hard-coded inside the JS
   chunks — verify with:

   ```bash
   grep -o '172.90.10.13:9910' dist/assets/*.js
   ```

3. Copy `dist/` to the host that will serve it.

   ```bash
   scp -r dist/ user@lan-host:/srv/leadscope
   ```

## Serve it (pick one)

### Option 1 — Python, zero install

If the host has Python 3:

```bash
cd /srv/leadscope
python3 -m http.server 8080
```

User opens `http://lan-host:8080/`.

### Option 2 — npx serve

If the host has Node:

```bash
cd /srv/leadscope
npx serve . -p 8080
```

### Option 3 — nginx

`/etc/nginx/sites-available/leadscope`:

```nginx
server {
    listen 8080 default_server;
    root /srv/leadscope;
    index index.html;
    location / { try_files $uri /index.html; }
}
```

```bash
sudo systemctl reload nginx
```

### Option 4 — share folder + double-click

Because the app uses `HashRouter`, opening `dist/index.html` straight off
the disk (no HTTP server at all) also works in most browsers — handy for
quick demos.

## Switching backends or keys

Edit `.env`, run `npm run build` again, copy the new `dist/` over. No
container rebuild, no env vars on a platform.

## Notes

- **HashRouter URLs** look like `http://lan-host:8080/#/dashboard`. The
  hash is intentional — it lets the SPA do client-side routing without
  needing the HTTP server to fall back to `index.html`.
- **CORS** — if the backend rejects the request with a CORS error, ask the
  backend team to allow the origin you're serving from
  (`http://lan-host:8080`). The same-origin nginx-proxy mode in the Docker
  image is the alternative if you can't change the backend.
- **Outside the LAN** — users not on the KISVN network won't be able to
  reach `172.90.10.13`, so the SPA's API calls will simply hang/fail. That
  is by design.
