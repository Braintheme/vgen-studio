# syntax=docker/dockerfile:1.7
# Shared Node image definitions. Targets:
#   dev           - api/admin in development (sources are bind-mounted)
#   remotion-dev  - Remotion worker / Studio in development (Chromium deps)

ARG NODE_IMAGE=node:24-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    CI=true
RUN corepack enable && corepack prepare pnpm@10.12.1 --activate \
 && pnpm config set store-dir /pnpm/store --global \
 && apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates tini \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENTRYPOINT ["/usr/bin/tini", "--"]

FROM base AS dev
CMD ["sleep", "infinity"]

# Shared libraries required by Chrome Headless Shell (per Remotion's Docker guide)
# plus a couple of font packages for glyph fallbacks.
FROM base AS remotion-dev
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev \
      libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
      fonts-noto-color-emoji fonts-dejavu-core \
 && rm -rf /var/lib/apt/lists/*
CMD ["sleep", "infinity"]
