# syntax=docker/dockerfile:1.7
# Production images (multi-stage). Targets: api, worker-remotion, worker-fake, admin.
# Built by docker-compose.prod.yml (`make prod-build`). Development uses docker/node.Dockerfile.

ARG NODE_IMAGE=node:24-bookworm-slim
ARG NGINX_IMAGE=nginx:1.29-alpine

# --- pnpm toolchain --------------------------------------------------------------
FROM ${NODE_IMAGE} AS pnpm
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate \
 && pnpm config set store-dir /pnpm/store --global
WORKDIR /repo

# --- build: install, compile every package, bundle Remotion, deploy apps ---------
FROM pnpm AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json ./
COPY scripts ./scripts
# Dev installs native binaries for the macOS host too (node_modules is shared with
# containers); an image only needs its own platform. Fails loudly if the block changes.
RUN grep -q '  os: \[current, linux, darwin\]' pnpm-workspace.yaml \
 && sed -i -e 's/  os: \[current, linux, darwin\]/  os: [current]/' \
           -e 's/  libc: \[current, glibc\]/  libc: [glibc]/' pnpm-workspace.yaml \
 && cp pnpm-workspace.yaml /tmp/pnpm-workspace.image.yaml
RUN --mount=type=cache,id=vgen-pnpm,target=/pnpm/store pnpm fetch
COPY . .
RUN cp /tmp/pnpm-workspace.image.yaml pnpm-workspace.yaml
RUN --mount=type=cache,id=vgen-pnpm,target=/pnpm/store pnpm install --frozen-lockfile --offline
# Compile workspace packages and apps with tsc (topological order).
RUN pnpm -r --filter './packages/**' --filter './apps/api' --filter './apps/worker-*' build
# Remotion compositions are bundled once here instead of at every worker start.
RUN pnpm --filter @vgen/engine-remotion bundle /out/remotion-bundle
# Self-contained apps: production dependencies + the compiled workspace packages they use.
RUN --mount=type=cache,id=vgen-pnpm,target=/pnpm/store \
    pnpm --filter @vgen/api deploy --prod --legacy /out/api \
 && pnpm --filter @vgen/worker-remotion deploy --prod --legacy /out/worker-remotion \
 && pnpm --filter @vgen/worker-fake deploy --prod --legacy /out/worker-fake

# --- admin static build ------------------------------------------------------------
FROM build AS admin-build
RUN pnpm --filter @vgen/admin build

# --- shared Node runtime -----------------------------------------------------------
FROM ${NODE_IMAGE} AS runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates tini \
 && rm -rf /var/lib/apt/lists/* \
 # Named volumes copy this ownership on first use, so the app user can write media.
 && mkdir -p /data/media \
 && chown node:node /data/media
ENV NODE_ENV=production \
    MEDIA_ROOT=/data/media
WORKDIR /app
ENTRYPOINT ["/usr/bin/tini", "--"]

FROM runtime AS api
COPY --from=build --chown=node:node /out/api /app
USER node
EXPOSE 3000
CMD ["node", "dist/main.js"]

FROM runtime AS worker-fake
COPY --from=build --chown=node:node /out/worker-fake /app
USER node
CMD ["node", "dist/main.js"]

FROM runtime AS worker-remotion
# Shared libraries required by Chrome Headless Shell (per Remotion's Docker guide).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev \
      libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
      fonts-noto-color-emoji fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /out/worker-remotion /app
COPY --from=build --chown=node:node /out/remotion-bundle /app/remotion-bundle
USER node
# The browser is downloaded once, into the engine package (see ensureRemotionBrowser).
RUN node -e "import('@vgen/engine-remotion/server').then((m) => m.ensureRemotionBrowser()).then((p) => console.log('browser:', p))"
ENV REMOTION_BUNDLE_DIR=/app/remotion-bundle
CMD ["node", "dist/main.js"]

FROM ${NGINX_IMAGE} AS admin
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=admin-build /repo/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
