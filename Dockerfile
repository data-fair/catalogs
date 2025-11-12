# =============================
# Base Node image
# =============================
FROM node:24-alpine AS base

WORKDIR /app
ENV NODE_ENV=production

# =============================
# Package preparation (stripping version for caching)
# =============================
FROM base AS package-strip

RUN apk add --no-cache jq moreutils
ADD package.json package-lock.json ./
# remove version from manifest for better caching when building a release
RUN jq '.version="build"' package.json | sponge package.json
RUN jq '.version="build"' package-lock.json | sponge package-lock.json

# =============================
# Full dependencies installation (for types and building)
# =============================
FROM base AS installer

RUN apk add --no-cache python3 make g++ git jq moreutils
RUN npm i -g clean-modules@3.0.4
COPY --from=package-strip /app/package.json package.json
COPY --from=package-strip /app/package-lock.json package-lock.json
COPY ui/package.json ui/package.json
COPY api/package.json api/package.json
COPY worker/package.json worker/package.json
# full deps install used for types and ui building
# also used to fill the npm cache for faster install api and worker deps
RUN npm ci --omit=dev --no-audit --no-fund

# =============================
# Build Types
# =============================
FROM installer AS types

COPY api/config api/config
COPY api/types api/types
COPY api/doc api/doc
COPY worker/config worker/config
# To resolve local ref to types-catalogs
COPY types-catalogs types-catalogs
RUN npm run build-types

# =============================
# Build UI with Vite
# =============================
FROM installer AS ui

RUN npm i --no-save @rollup/rollup-linux-x64-musl
COPY --from=types /app/api/config api/config
COPY --from=types /app/api/types api/types
COPY --from=types /app/api/doc api/doc
ADD /api/src/config.ts api/src/config.ts
COPY shared shared
ADD /ui ui
RUN npm -w ui run build

# =============================
# Install production dependencies for Worker
# =============================
FROM installer AS worker-installer

RUN npm ci -w worker --prefer-offline --omit=dev --omit=optional --no-audit --no-fund && \
    npx clean-modules --yes
RUN mkdir -p /app/worker/node_modules
RUN mkdir -p /app/shared/node_modules

# =============================
# Final Worker Image
# =============================
FROM base AS worker

COPY --from=worker-installer /app/node_modules node_modules
COPY worker worker
COPY shared shared
COPY upgrade upgrade
COPY --from=types /app/worker/config worker/config
COPY --from=types /app/api/types api/types
COPY --from=worker-installer /app/shared/node_modules shared/node_modules
COPY --from=worker-installer /app/worker/node_modules worker/node_modules
COPY package.json README.md LICENSE BUILD.json* ./

EXPOSE 9090
USER node

WORKDIR /app/worker
CMD ["node", "index.ts"]

# =============================
# Install production dependencies for API
# =============================
FROM installer AS api-installer

# remove other workspaces and reinstall, otherwise we can get rig have some peer dependencies from other workspaces
RUN npm ci -w api --prefer-offline --omit=dev --omit=optional --no-audit --no-fund && \
    npx clean-modules --yes
RUN mkdir -p /app/shared/node_modules
RUN mkdir -p /app/api/node_modules

# =============================
# Final API Image
# =============================
FROM base AS main

COPY --from=api-installer /app/node_modules node_modules
COPY shared shared
COPY api api
COPY --from=types /app/api/config api/config
COPY --from=types /app/api/types api/types
COPY --from=types /app/api/doc api/doc
COPY --from=api-installer /app/shared/node_modules shared/node_modules
COPY --from=api-installer /app/api/node_modules api/node_modules
COPY --from=ui /app/ui/dist ui/dist
COPY package.json README.md LICENSE BUILD.json* ./
# artificially create a dependency to "worker" target for better caching in github ci
COPY --from=worker /app/package.json package.json
EXPOSE 8080
EXPOSE 9090
USER node

WORKDIR /app/api
CMD ["node", "--max-http-header-size", "64000", "index.ts"]
