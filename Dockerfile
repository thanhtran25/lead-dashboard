# syntax=docker/dockerfile:1.7
#
# Multi-stage build for the LeadScope dashboard.
#
#   Stage 1 (build)   — install deps, run `vite build`
#   Stage 2 (runtime) — serve the built SPA via Nginx and reverse-proxy
#                       /api/* to the backend specified at container start.
#
# Build:
#   docker build -t leadscope:latest \
#     --build-arg VITE_FIREBASE_KEY=AIzaSy... \
#     .
#
# Run:
#   docker run --rm -p 8080:80 \
#     -e BACKEND_URL=http://172.90.10.13:9910 \
#     leadscope:latest
#

# -----------------------------------------------------------------------------
# Stage 1: Build the SPA
# -----------------------------------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

# Build-time configuration. We do NOT bake real values into the bundle —
# runtime config (window.__APP_CONFIG__ written by the entrypoint script)
# is the source of truth in production. The ARG declarations exist purely so
# CI systems that DO forward build args have somewhere to land them.
ARG VITE_FIREBASE_KEY=""
ARG VITE_CLIENT_TYPE=CLIENT_TYPE_WEB
ARG VITE_STATS_PATH_PREFIX=/api/v1/stats
ARG VITE_BASE_PATH=""

ENV VITE_FIREBASE_KEY=${VITE_FIREBASE_KEY} \
    VITE_CLIENT_TYPE=${VITE_CLIENT_TYPE} \
    VITE_STATS_PATH_PREFIX=${VITE_STATS_PATH_PREFIX} \
    VITE_BASE_PATH=${VITE_BASE_PATH}

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Serve via Nginx
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Runtime configuration — both vars are substituted into nginx.conf by the
# nginx:alpine entrypoint (which runs envsubst on /etc/nginx/templates/*).
#   PORT        port nginx listens on (matches Koyeb's default service port)
#   BACKEND_URL upstream the /api/* proxy forwards to
ENV PORT=8000 \
    BACKEND_URL=http://172.90.10.13:9910

# Remove the default site config so it can't conflict with ours.
RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Runtime config writer. nginx:alpine runs every executable in
# /docker-entrypoint.d/ at start (alphabetical), so this script renders
# /usr/share/nginx/html/config.js from env vars before nginx serves traffic.
COPY docker/40-write-config-js.sh /docker-entrypoint.d/40-write-config-js.sh
RUN chmod +x /docker-entrypoint.d/40-write-config-js.sh

EXPOSE 8000

# No application-level HEALTHCHECK — most platforms (Koyeb, Render, Fly, …)
# run their own TCP/HTTP probes on $PORT, and a Docker-level probe just adds
# noise when the backend is unreachable from the runtime network anyway.
