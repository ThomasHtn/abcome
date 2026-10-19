# syntax=docker/dockerfile:1

# Base images are pinned by version and digest for reproducible builds; Dependabot bumps both.

# ---- Build stage ------------------------------------------------------------
# Quality gates (format, lint, test) run in CI before an image is built, so this stage only builds.
# Runs on the builder's own platform: the bundle is static, the same for every architecture.
FROM --platform=$BUILDPLATFORM node:22.23.3-alpine3.24@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS build
WORKDIR /workspace

# Installed before the sources, so this layer only changes with the dependencies.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime stage ------------------------------------------------------------
# nginx serves the bundle; the reverse proxy terminates HTTPS and routes /api/* to the backend on the same origin.
# The unprivileged image runs every nginx process as the `nginx` user, never root.
FROM nginxinc/nginx-unprivileged:1.31.7-alpine3.24@sha256:b5047b9b76845eac124358373c6852377c52e4b05834a47647e955dd91cb8f1e AS runtime

# Alpine security fixes land days before a rebuilt base image: applied at build time, so the image
# scan of the delivery only fails on what nobody can fix yet. Back to the nginx user right after.
USER root
RUN apk upgrade --no-cache
USER 101

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist/frontend/browser /usr/share/nginx/html

EXPOSE 8080

# Probes nginx itself through its /healthz route, which skips the access log.
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD ["curl", "-fsS", "-o", "/dev/null", "http://127.0.0.1:8080/healthz"]
