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

# Build-time configuration. Firebase Web API keys are public and safe to bake
# into the bundle, so passing them as build args is fine. The backend host is
# NOT baked in: we leave VITE_BASE_PATH empty so the SPA always calls /api/*
# relative to its own origin, which Nginx forwards at runtime.
ARG VITE_FIREBASE_KEY=""
ARG VITE_CLIENT_TYPE=CLIENT_TYPE_WEB
ARG VITE_STATS_PATH_PREFIX=/api/v1/stats

ENV VITE_BASE_PATH="" \
    VITE_FIREBASE_KEY=${VITE_FIREBASE_KEY} \
    VITE_CLIENT_TYPE=${VITE_CLIENT_TYPE} \
    VITE_STATS_PATH_PREFIX=${VITE_STATS_PATH_PREFIX}

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Serve via Nginx
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# Backend URL — substituted into nginx config at container start by the
# nginx:alpine entrypoint (which runs envsubst on /etc/nginx/templates/*).
ENV BACKEND_URL=http://172.90.10.13:9910

# Remove the default site config so it can't conflict with ours.
RUN rm -f /etc/nginx/conf.d/default.conf

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

# Basic health check — nginx returns 200 on /healthz (defined in nginx conf).
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
