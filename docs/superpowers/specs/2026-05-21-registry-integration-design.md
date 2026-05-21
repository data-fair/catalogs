# Registry integration for `@data-fair/catalogs` (v1.0.0)

**Status:** approved design — ready for implementation planning
**Date:** 2026-05-21
**Branch:** `feat-registry`

## Summary

Replace local plugin storage with the `@data-fair/registry` service. Catalog
plugins become registry artefacts (`format: "npm"`, `category: "catalog"`). The
catalogs API and worker resolve plugins on demand through
`@data-fair/lib-node-registry`'s `ensureArtefact()`, which downloads and
extracts a plugin tarball into a local cache keyed by the artefact's
`dataUpdatedAt`. There is **no mirroring** — the registry is the single source
of truth and the only local copy is that on-demand extraction cache.

Plugin install / update / uninstall leaves `@data-fair/catalogs` entirely; that
lifecycle is owned by the registry's own UI and by CI pipelines. This is a
breaking change shipped as **v1.0.0** (current version: `0.11.0`).

This mirrors the v6 registry integration done in the sister `@data-fair/processings`
service (commit `a061246`), adapted to the differences described below.

### How catalogs differs from processings

A processings plugin exposes only a `run`/`prepare` function plus a
`processing-config-schema.json` file. A **catalogs plugin is a richer module**:
its default export carries methods (`list`, `prepare`, `assertConfigValid`,
`download`, `publishDataset`, …) *and* schema/metadata properties
(`configSchema`, `metadata`, `listFiltersSchema`, `importFiltersSchema`,
`publicationFiltersSchema`, `importConfigSchema`). These are only obtainable by
dynamically importing the plugin module. The registry stores opaque tarballs and
cannot produce them — so the catalogs API keeps one endpoint
(`GET /api/plugins/:id`) that downloads, imports and exposes a plugin's schemas.

## Goals

1. Make a registry link mandatory; remove the local plugins volume as the plugin
   store.
2. Provide a one-time boot migration that uploads existing on-disk plugins to
   the registry.
3. List plugins directly from the registry (UI → registry API) and resolve
   plugin code on demand into a local cache.

## Non-goals

- Registry-side features (mirroring, federation, access grants, remote
  registries) — those live in the registry service.
- Backwards compatibility with the local plugins volume beyond the v1.0.0 boot
  migration. `dataDir` support and the migration script are removed in v2.0.0.
- Showing per-plugin capability chips in the catalog-creation picker *before* a
  plugin is selected (capabilities load on selection — see §6).
- A per-plugin usage count in the UI (the old `facets.usages` aggregation is
  dropped — accepted trade-off of not proxying the list through the API).

## Background — current architecture

- Plugins live under `<dataDir>/plugins/<pluginId>/`: a `plugin.json` metadata
  file plus a `<version>/` directory holding the extracted npm package
  (`package.json`, `index.ts`, installed `node_modules`).
- `pluginId` = npm package name with `/` flattened to `-`, suffixed with
  `-<major>` (e.g. `@data-fair-catalog-mock-0`). It is stored verbatim on
  `catalog.plugin`.
- `api/src/plugins/service.ts` — `installPlugin` (upload `.tgz` or `npm pack`
  from npm), `getPlugin` (read `plugin.json`, dynamic-import the module),
  `getPluginThumbnailPath`, `getTarball` (multer).
- `api/src/plugins/router.ts` — `POST /` install, `GET /` list (+ usage facets),
  `GET /:id`, `DELETE /:id`, `GET /:id/thumbnail`.
- `api/src/plugins/registry/router.ts` — npm-registry keyword search for
  installable plugins, mounted at `/api/plugins-registry`.
- `worker/src/worker.ts` `iter()` — reads `plugin.json` and dynamic-imports the
  plugin directly from `<dataDir>/plugins/...`.
- `ui/src/pages/admin/plugins.vue` — install / update / uninstall UI.
- `ui/src/pages/catalogs/new.vue` — plugin picker for catalog creation.

## Design

### 1 — Configuration

**API config** (`api/config/*.mjs`, `api/config/type/schema.json`,
`api/src/config.ts`):

- Add `privateRegistryUrl` — required, `^https?://`, default
  `http://registry:8080`. Internal URL the API uses for server-to-server calls
  to the registry.
- Add `secretKeys.registry` — required string, the `x-secret-key` shared with
  the registry (`config.secretKeys.internalServices` on the registry side).
- Make `dataDir` **optional** — drop it from `required`. When unset, `tmpDir`
  falls back to `<os.tmpdir>/data-fair-catalogs`; when set, `tmpDir` stays
  `<dataDir>/tmp` as today.
- `api/src/config.ts` computes and exports
  `registryCacheDir = path.join(tmpDir, 'registry-cache')`.
- `custom-environment-variables.mjs`: add `PRIVATE_REGISTRY_URL` and
  `SECRET_REGISTRY`.
- Remove the now-orphaned `npm` config block (only consumed by the removed
  npm-search router and the removed `npm pack` install path).

**Worker config** (`worker/config/*.mjs`, `worker/config/type/schema.json`,
`worker/src/config.ts`): the same additions — `privateRegistryUrl`,
`secretKeys.registry`, `dataDir` optional, `tmpDir` fallback, exported
`registryCacheDir`.

`dataDir`, when set, is consulted **only** by the v1.0.0 boot migration to read
legacy plugins. It can be unmounted after migration; it is removed entirely in
v2.0.0.

### 2 — Shared plugin loader

New file `shared/plugin-load.ts`, exported as
`@data-fair/catalogs-shared/plugin-load.ts`:

```ts
export const importPluginModule = async <T = unknown>(
  pluginDir: string,
  opts?: { cacheBust?: boolean }
): Promise<T>
```

Reads `package.json#main` (default `index.js`), resolves it against
`pluginDir`, verifies the file exists, and dynamic-imports it. `cacheBust`
appends a `?imported=<timestamp>` query so a module can be re-imported fresh in
the same process. One implementation, used by both the API and the worker.

### 3 — Plugin resolution (`api/src/plugins/service.ts`)

Rewrite around `ensureArtefact`:

```ts
getPlugin(artefactId: string, account: Account): Promise<CatalogPlugin>
```

1. `ensureArtefact({ registryUrl: config.privateRegistryUrl,
   secretKey: config.secretKeys.registry, artefactId,
   cacheDir: registryCacheDir, architecture: process.arch, account })` —
   downloads + extracts the tarball on a cache miss, returns the cached path on
   a hit. The cache is invalidated when the artefact's `dataUpdatedAt` bumps.
2. `importPluginModule(ensured.path)` → the `CatalogPlugin` default export.
3. Keep the existing compatibility shim:
   `if (plugin.listResources && !plugin.list) plugin.list = plugin.listResources`.
4. Registry errors surface unchanged: `404` (unknown artefact) and `403` (owner
   has no access to a private artefact) bubble up as the corresponding HTTP
   errors.

`getPluginThumbnailPath(artefactId, account)` — `ensureArtefact`, then resolve
`metadata.thumbnailPath` inside the cached directory (still used internally if
needed; the UI itself uses the registry thumbnail endpoint — see §6).

**Remove:** `installPlugin`, `getTarball` (multer), and every reference to
`<dataDir>/plugins`.

`getPlugin` callers — `catalogs/service.ts` (`validateCatalog`,
`prepareCatalog`) and `catalogs/router.ts` (`POST /`, `GET /:id/resources`) —
pass the relevant account: `catalog.owner` for catalog operations. The registry
then enforces that owner's access to private artefacts; a `403`/`404` replaces
any ad-hoc access check.

### 4 — API routes (`api/src/plugins/router.ts`, `api/src/app.ts`)

The UI talks to the registry API **directly** (same domain, `/registry` path,
shared Simple Directory session cookie). The catalogs API does **not** proxy
registry list/thumbnail endpoints.

- **Keep** `GET /api/plugins/:id` — resolves the plugin via `getPlugin`
  (`ensureArtefact` + import) and returns the full plugin descriptor:
  `{ id, name, description, version, configSchema, metadata, listFiltersSchema,
  importFiltersSchema, publicationFiltersSchema, importConfigSchema }`. This is
  not a proxy — only the catalogs API can extract and import a plugin module to
  expose its schemas. The UI needs it to render the catalog config form. The
  account passed to `ensureArtefact` is the requesting session's account.
- **Remove** `GET /api/plugins` (list), `GET /api/plugins/:id/thumbnail`,
  `POST /api/plugins` (install), `DELETE /api/plugins/:id` (uninstall).
- **Remove** `api/src/plugins/registry/router.ts` (npm search) entirely.
- `api/src/app.ts` — drop the `/api/plugins-registry` mount and the
  `pluginsRegistryRouter` import. Keep `/api/plugins` mounted (now only
  `GET /:id`).

`api/types/plugin/schema.js` keeps only the full `Plugin` shape (consumed by
`GET /:id`). No list-summary type is needed: the plugin list is the registry's
own `Artefact` type, consumed directly by the UI.

### 5 — Worker (`worker/src/worker.ts`)

In `iter()`, replace the `<dataDir>/plugins/...` read with registry resolution:

```ts
const ensured = await ensureArtefact({
  registryUrl: config.privateRegistryUrl,
  secretKey: config.secretKeys.registry,
  artefactId: catalog.plugin,
  cacheDir: registryCacheDir,
  architecture: process.arch,
  account: catalog.owner
})
const plugin = await importPluginModule<CatalogPlugin>(ensured.path)
```

On a registry `404`/`403` the task is marked `error` with a clear log message
(`"Le plugin <id> n'est plus disponible (supprimé ou accès retiré)."`) instead
of the current generic "Plugin not found".

`worker/src/worker.ts` `start()` — drop the
`if (!fs.existsSync(config.dataDir)) throw ...` hard-check; `dataDir` is now
optional.

### 6 — UI

- **Remove** `ui/src/pages/admin/plugins.vue` and its entry in
  `ui/src/pages/admin/index.vue`. Remove install-related code in
  `ui/src/pages/dev.vue`.
- **Plugin picker** (`ui/src/pages/catalogs/new.vue`): step 1 lists plugins
  directly from `GET /registry/api/v1/artefacts?format=npm&category=catalog`
  (same-domain request; the browser session cookie lets the registry
  access-filter the results). Cards render the registry artefact's `title`,
  `description` and thumbnail.
- **Thumbnails** come straight from
  `GET /registry/api/v1/artefacts/:id/thumbnail` — there is no catalogs-side
  thumbnail route.
- When a plugin is selected, fetch `GET /api/plugins/:id` to obtain the
  `configSchema`, `metadata`, `capabilities` and filter schemas the later
  wizard steps need. Any code that assumed `plugin.metadata` / `configSchema`
  is present at list time must be adjusted to load it on selection.

### 7 — Upgrade script

New file `upgrade/1.0.0/01-publish-plugins-to-registry.ts`, run once on worker
boot by the existing `@data-fair/lib-node/upgrade-scripts.js` runner (already
wired in `worker.ts` via `config.upgradeRoot`).

Behaviour:

1. If `config.dataDir` is unset or `<dataDir>/plugins` does not exist, log and
   return (nothing to migrate — a fresh v1.0.0 install).
2. For each plugin directory `<dataDir>/plugins/<id>/`:
   - Read `plugin.json` → `{ name, version }`. The extracted package is at
     `<id>/<version>/` (contains the plugin's real `package.json`, source, and
     installed `node_modules`).
   - **Probe** `GET /api/v1/artefacts/<id>`; skip if a tarball slot already
     exists for the host architecture (`tarballs[process.arch]`) — makes the
     script idempotent across re-runs.
   - **Repack** `<id>/<version>/` into a gzipped tarball with the npm `package/`
     prefix. `node_modules` is included so `ensureArtefact` consumers get a
     runnable bundle; symlinks are preserved as symlinks. The plugin's real
     `package.json` already carries `name` + `version`, so no manifest needs to
     be synthesized (unlike the processings v5 wrapper case).
   - **Upload** `POST /api/v1/artefacts/npm/<id>` with form fields
     `architecture=<process.arch>`, `category=catalog`, `file=<tarball>`,
     authenticated with the `x-secret-key` header.
   - **PATCH** `PATCH /api/v1/artefacts/<id>` with `public: true` — preserves
     today's behaviour where every account-admin can use every installed
     plugin. (Operators can later make a plugin private from the registry UI.)
   - **Best-effort thumbnail**: import the plugin module to read
     `metadata.thumbnailPath`; if present, upload that image file to
     `POST /api/v1/artefacts/<id>/thumbnail`. Any failure (import throws,
     missing file, upload rejected) is logged and skipped — the picker then
     shows a fallback icon until an operator uploads one. This matters because
     the picker relies entirely on the registry thumbnail for migrated plugins.
3. Per-directory failures are collected and surfaced together at the end; one
   broken plugin directory does not block migration of the rest.

The artefact id equals the legacy plugin directory name, which equals the value
already stored on every `catalog.plugin`. Existing catalog documents therefore
need **no migration** — they keep working as soon as their plugin is published.

The migration relies on the upgrade-scripts mongo lock, so only one worker pod
runs it at a time.

### 8 — Dependencies, dev environment, tests

**Dependencies:**

- Add `@data-fair/lib-node-registry` `^0.4.0` to `api` and `worker`.
- Remove `multer` (only used by the deleted plugin-upload path). Audit
  `semver`, `tmp-promise`, `form-data` and remove any left with no remaining
  consumer.

**Dev environment:**

- `docker-compose.yml` — add a `registry` service so the dev API/worker/UI and
  the Playwright suite have a registry to talk to.
- `dev/resources/nginx.conf.template` — add a `/registry` location proxying to
  the registry service (load-bearing: the UI hits it directly).
- `dev/init-env.sh` — generate a registry secret into the per-worktree `.env`
  and pass it to both catalogs and the registry container as the shared
  `x-secret-key`.
- Open implementation detail (resolved during planning): whether the dev
  `registry` service uses a published image or builds from the local
  `/home/alban/data-fair/registry` repo.

**Health check** (`api/src/admin/status.ts`): make the `data volume` check
conditional on `config.dataDir` being set (skip it otherwise, since `dataDir`
is now optional). Optionally add a registry-reachability check.

**Tests** (`tests/`):

- New `tests/support/registry.ts` helper to publish test catalog plugins to the
  dev registry (upload tarball via the registry API).
- Update `tests/support/axios.ts` and `tests/state-setup.ts` as needed for the
  registry service.
- Rework `tests/features/plugins/*`: remove the install spec; add a
  registry-resolution spec (a catalog resolves its plugin via the registry,
  cache hit/miss, `404`/`403` handling).
- `DELETE /api/test-env/plugins` — wipe the `registryCacheDir` instead of
  `<dataDir>/plugins`.

## Risks and mitigations

- **Registry unavailable at runtime** — catalog creation, the worker, and
  `GET /api/plugins/:id` all fail if the registry is down. Mitigation: the
  registry is an internal service on the same deployment; failures surface as
  clear `5xx`/log messages. No offline fallback (matches processings).
- **Cache under `os.tmpdir()` is ephemeral** when `dataDir` is unset — plugins
  re-download after a container restart. Accepted: it is a cache, and
  `ensureArtefact` re-fetches transparently.
- **Architecture mismatch** — native plugin bindings must be built for the
  consumer's `process.arch`. The migration uploads under the host arch; CI must
  upload matching arch slots. Documented in the registry CI integration guide.
- **A plugin made private after catalogs are using it** — existing catalogs
  whose owner loses access fail at the next worker run with an explicit
  "plugin no longer available" log, rather than silently.

## Migration / rollout

1. Deploy v1.0.0 with `privateRegistryUrl` + `secretKeys.registry` configured
   and the legacy `dataDir` still mounted.
2. The worker boot migration publishes every on-disk plugin to the registry.
3. Verify catalogs resolve and run; verify the picker lists plugins.
4. Unmount `dataDir` at leisure. It is removed entirely in v2.0.0.

## Affected files (indicative)

- `package.json` — version `1.0.0`.
- `api/config/{default,development,production,custom-environment-variables}.mjs`,
  `api/config/type/schema.json`, `api/src/config.ts`.
- `worker/config/*`, `worker/src/config.ts`.
- `shared/plugin-load.ts` (new), `shared/package.json`.
- `api/src/plugins/service.ts`, `api/src/plugins/router.ts`,
  `api/src/plugins/registry/router.ts` (deleted), `api/src/app.ts`.
- `api/src/catalogs/service.ts`, `api/src/catalogs/router.ts`.
- `api/src/admin/status.ts`, `api/src/misc/routers/test-env.ts`.
- `api/types/plugin/schema.js`.
- `worker/src/worker.ts`.
- `ui/src/pages/admin/plugins.vue` (deleted), `ui/src/pages/admin/index.vue`,
  `ui/src/pages/catalogs/new.vue`, `ui/src/pages/dev.vue`.
- `upgrade/1.0.0/01-publish-plugins-to-registry.ts` (new).
- `api/package.json`, `worker/package.json`.
- `docker-compose.yml`, `dev/resources/nginx.conf.template`,
  `dev/init-env.sh`.
- `tests/support/registry.ts` (new), `tests/support/axios.ts`,
  `tests/state-setup.ts`, `tests/features/plugins/*`.
