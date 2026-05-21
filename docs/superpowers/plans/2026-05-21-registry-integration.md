# Registry Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the local plugins volume in `@data-fair/catalogs` with the `@data-fair/registry` service — plugins are resolved on demand via `@data-fair/lib-node-registry` into a local cache, the UI lists plugins from the registry API directly, and a v1.0.0 boot migration publishes existing on-disk plugins to the registry.

**Architecture:** Catalog plugins become registry artefacts (`format: "npm"`, `category: "catalog"`). The catalogs API and worker call `ensureArtefact()` to download + extract a plugin tarball into a cache keyed by the artefact's `dataUpdatedAt`, then dynamic-import the plugin module. The catalog-creation UI lists plugins straight from `/registry/api/v1/artefacts`. Plugin install/update/uninstall is removed — that lifecycle moves to the registry's own UI.

**Tech Stack:** Node.js 24, TypeScript, Express 5, Vue 3 + Vuetify, MongoDB, Playwright tests, docker compose dev environment, `@data-fair/lib-node-registry` registry client.

**Reference spec:** `docs/superpowers/specs/2026-05-21-registry-integration-design.md`

---

## Conventions for the worker executing this plan

- **Never start/stop/restart dev processes.** The dev API, dev worker and dev UI run in zellij panes managed by the user. The dev API and worker use `nodemon -e js,ts,json` — editing `.ts`/`.js`/`.json` files hot-reloads them; editing `.mjs` config files or `docker-compose.yml` does **not**. Tasks that need a restart say so and stop at a **CHECKPOINT**.
- **Commit messages** follow Conventional Commits (the repo enforces `commitlint`). Use `feat:`, `feat!:`, `fix:`, `chore:`, `test:`, `refactor:`, `docs:`.
- **After editing any `*/config/type/schema.json`, `api/types/**/schema.js`, or `api/doc/**/schema.ts`**, run `npm run build-types` from the repo root and commit the regenerated `.type/` directories together with the schema change.
- Run commands from the repo root: `/home/alban/data-fair/catalogs_feat-registry`.
- The mock plugin used by tests is `@data-fair/catalog-mock`; its registry artefact id is `@data-fair-catalog-mock-0`.

## File Structure

Files created:

- `shared/plugin-load.ts` — `importPluginModule()` helper (resolve `package.json#main`, dynamic-import).
- `tests/support/registry.ts` — test helper to publish/delete the mock plugin in the dev registry.
- `tests/features/shared/plugin-load.unit.spec.ts` — unit test for the loader.
- `tests/features/plugins/registry.api.spec.ts` — api test for registry-backed plugin resolution (replaces the old file of the same name).
- `tests/features/catalogs/new.e2e.spec.ts` — e2e test for the catalog-creation plugin picker.
- `upgrade/1.0.0/01-publish-plugins-to-registry.ts` — v1.0.0 boot migration.

Files modified: `docker-compose.yml`, `dev/resources/nginx.conf.template`, `dev/init-env.sh`, `dev/status.sh`, `.env`, `api/config/*`, `worker/config/*`, `api/src/config.ts`, `worker/src/config.ts`, `api/src/server.ts`, `worker/src/worker.ts`, `worker/src/lib/import.ts`, `api/src/plugins/service.ts`, `api/src/plugins/router.ts`, `api/src/app.ts`, `api/src/catalogs/service.ts`, `api/src/catalogs/router.ts`, `api/src/admin/status.ts`, `api/src/misc/routers/test-env.ts`, `api/doc/index.ts`, `tests/support/axios.ts`, `ui/src/pages/catalogs/new.vue`, `ui/src/pages/dev.vue`, `api/package.json`, `worker/package.json`, `package.json`.

Files deleted: `api/src/plugins/registry/router.ts`, `api/doc/plugins/` (whole directory), `ui/src/pages/admin/` (whole directory), `tests/features/plugins/install.api.spec.ts`, `tests/features/plugins/registry.api.spec.ts` (old version — recreated in Task 7), `upgrade/.empty`.

---

## Task 1: Add the registry service to the dev environment

Adds a `registry` container to docker compose, an nginx `/registry` route, a `REGISTRY_PORT` to the env, and a status-check line. No automated test — this is infrastructure verified at CHECKPOINT A.

**Files:**
- Modify: `docker-compose.yml`
- Modify: `dev/resources/nginx.conf.template`
- Modify: `dev/init-env.sh`
- Modify: `dev/status.sh`
- Modify: `.env` (gitignored — not committed)

- [ ] **Step 1: Add the `registry` service to `docker-compose.yml`**

In `docker-compose.yml`, inside the `nginx` service's `environment:` list, add a line after `- EVENTS_PORT=${EVENTS_PORT}`:

```yaml
      - REGISTRY_PORT=${REGISTRY_PORT}
```

Then add this service definition immediately after the `events:` service block (before the `# db and search engine` comment):

```yaml
  # registry-side dev container — same domain as catalogs under /registry
  # so the UI lists artefacts directly using the SimpleDirectory session cookie.
  registry:
    profiles:
      - dev
    image: ghcr.io/data-fair/registry:main
    network_mode: host
    depends_on:
      - mongo
      - simple-directory
    environment:
      - PORT=${REGISTRY_PORT}
      - MONGO_URL=mongodb://localhost:${MONGO_PORT}/data-fair-registry
      - PRIVATE_DIRECTORY_URL=http://localhost:${SD_PORT}
      - PUBLIC_URL=http://${DEV_HOST}:${NGINX_PORT}/registry
      - SECRET_INTERNAL_SERVICES=secret-registry-internal
      - CIPHER_PASSWORD=1234567890123456789012345678901234567890
      - API_KEYS_SALT=1234567890123456789012345678901234567890
      - OBSERVER_ACTIVE=false
      - FILES_STORAGE=fs
      # /tmp is world-writable in the registry image; tarballs are throwaway in
      # dev/test so they stay inside the container with no named volume.
      - DATA_DIR=/tmp/registry-data
```

- [ ] **Step 2: Add the `/registry` location to the nginx template**

In `dev/resources/nginx.conf.template`, add this block after the `location /events/ { ... }` block (before the closing `}` of the `server` block):

```
  # registry — same domain so the catalogs UI lists artefacts directly with
  # the SimpleDirectory session cookie. The registry expects the /registry
  # prefix in the URL (PUBLIC_URL=...registry).
  location /registry/ {
    proxy_pass http://localhost:${REGISTRY_PORT};
  }
```

- [ ] **Step 3: Make `init-env.sh` generate a `REGISTRY_PORT`**

In `dev/init-env.sh`, inside the `cat <<EOF > ".env"` heredoc, add a line after `DF_PORT=$((RANDOM_NB + 32))`:

```
REGISTRY_PORT=$((RANDOM_NB + 33))
```

- [ ] **Step 4: Add `REGISTRY_PORT` to the current `.env`**

The existing `.env` for this worktree has no `REGISTRY_PORT`. Append one to it, derived from the existing base (`NGINX_PORT` is `7946`, so `7946 + 33 = 7979`). Add this line to the end of `.env`:

```
REGISTRY_PORT=7979
```

(If `.env` already has a `REGISTRY_PORT`, leave it. `.env` is gitignored and is not committed.)

- [ ] **Step 5: Add a registry line to `dev/status.sh`**

In `dev/status.sh`, in the "Docker compose services" section, add a line after `check_http "events" ...`:

```bash
check_http "registry" "${NGINX}/registry/"
```

- [ ] **Step 6: Verify the docker-compose file is valid**

Run: `docker compose --profile dev config --quiet`
Expected: no output, exit code 0 (the compose file parses and `${REGISTRY_PORT}` resolves from `.env`).

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml dev/resources/nginx.conf.template dev/init-env.sh dev/status.sh
git commit -m "feat: add registry service to the dev environment"
```

(`.env` is gitignored and intentionally not staged.)

---

## Task 2: API configuration for the registry

Adds `privateRegistryUrl` and `secretKeys.registry` to the API config, a `tmpDir` fallback, and a `registryCacheDir` export. `dataDir` stays required for now (it is made optional in Task 7, alongside the code that stops using it).

**Files:**
- Modify: `api/config/type/schema.json`
- Modify: `api/config/default.mjs`
- Modify: `api/config/development.mjs`
- Modify: `api/config/custom-environment-variables.mjs`
- Modify: `api/src/config.ts`
- Modify: `api/src/server.ts`

- [ ] **Step 1: Add the new properties to the API config schema**

In `api/config/type/schema.json`:

In the top-level `required` array, add `"privateRegistryUrl"` (keep the array alphabetically-ish consistent with the file; placement does not matter functionally).

In `properties`, add a `privateRegistryUrl` property after `privateEventsUrl`:

```json
    "privateRegistryUrl": {
      "type": "string",
      "pattern": "^https?://",
      "description": "Internal URL used by the API to call the registry server-to-server. The UI hits /registry on the same domain."
    },
```

In `properties.secretKeys.required`, add `"registry"` so it becomes `["catalogs", "identities", "registry"]`.

In `properties.secretKeys.properties`, add:

```json
        "registry": {
          "type": "string",
          "description": "x-secret-key shared with the registry (matches the registry's secretKeys.internalServices)."
        },
```

- [ ] **Step 2: Add defaults in `api/config/default.mjs`**

In `api/config/default.mjs`, add `privateRegistryUrl` after `privateEventsUrl`:

```js
  privateEventsUrl: undefined,
  privateRegistryUrl: 'http://registry:8080',
```

And in the `secretKeys` object add `registry`:

```js
  secretKeys: {
    catalogs: undefined,
    events: undefined,
    identities: undefined,
    registry: undefined
  },
```

- [ ] **Step 3: Add dev values in `api/config/development.mjs`**

In `api/config/development.mjs`, add a `registryPort` constant alongside the other port constants at the top:

```js
const registryPort = process.env.REGISTRY_PORT ?? '8089'
```

Add `privateRegistryUrl` after `privateEventsUrl` in the exported object:

```js
  privateEventsUrl: `http://localhost:${eventsPort}`,
  privateRegistryUrl: `http://localhost:${registryPort}`,
```

And add `registry` to the `secretKeys` object:

```js
  secretKeys: {
    catalogs: 'secret-catalogs',
    events: 'secret-events',
    identities: 'secret-identities',
    registry: 'secret-registry-internal'
  }
```

- [ ] **Step 4: Map the env vars in `api/config/custom-environment-variables.mjs`**

In `api/config/custom-environment-variables.mjs`, add `privateRegistryUrl` after `privateEventsUrl`:

```js
  privateEventsUrl: 'PRIVATE_EVENTS_URL',
  privateRegistryUrl: 'PRIVATE_REGISTRY_URL',
```

And add `registry` to `secretKeys`:

```js
  secretKeys: {
    catalogs: 'SECRET_CATALOGS',
    events: 'SECRET_EVENTS',
    identities: 'SECRET_IDENTITIES',
    registry: 'SECRET_REGISTRY'
  },
```

- [ ] **Step 5: Regenerate config types**

Run: `npm run build-types`
Expected: completes without error; `api/config/type/.type/` is updated (the `ApiConfig` type now has `privateRegistryUrl` and `secretKeys.registry`).

- [ ] **Step 6: Add the `tmpDir` fallback and `registryCacheDir` export in `api/src/config.ts`**

Replace the entire contents of `api/src/config.ts` with:

```ts
import path from 'node:path'
import os from 'node:os'
import type { ApiConfig } from '../config/type/index.ts'
import { assertValid } from '../config/type/index.ts'
import config from 'config'

assertValid(config, { lang: 'en', name: 'config', internal: true })

const rawConfig = config as unknown as ApiConfig

// tmpDir defaults to <dataDir>/tmp when dataDir is set, else an OS temp dir.
if (!rawConfig.tmpDir) {
  rawConfig.tmpDir = rawConfig.dataDir
    ? path.join(rawConfig.dataDir, 'tmp')
    : path.join(os.tmpdir(), 'data-fair-catalogs')
}

const apiConfig = rawConfig as ApiConfig & { tmpDir: string }
export default apiConfig

// The registry artefact cache always lives under tmpDir.
export const registryCacheDir = path.join(apiConfig.tmpDir, 'registry-cache')

export const uiConfig = {}
export type UiConfig = typeof uiConfig
```

- [ ] **Step 7: Make the `dataDir` boot guard tolerant of an absent dataDir in `api/src/server.ts`**

In `api/src/server.ts`, in the `start()` function, replace this line:

```ts
  if (!existsSync(config.dataDir)) throw new Error(`Data directory ${resolvePath(config.dataDir)} was not mounted`)
```

with:

```ts
  if (config.dataDir && !existsSync(config.dataDir)) throw new Error(`Data directory ${resolvePath(config.dataDir)} was not mounted`)
```

(Leave the rest of `server.ts` unchanged — the `npm` proxy block is removed in Task 12, after its last consumer is gone.)

- [ ] **Step 8: Type-check**

Run: `npm run check-types`
Expected: PASS (no type errors).

- [ ] **Step 9: Commit**

```bash
git add api/config api/src/config.ts api/src/server.ts
git commit -m "feat: add registry config to the API"
```

---

## Task 3: Worker configuration for the registry

Mirrors Task 2 for the worker. `dataDir` stays required for now (made optional in Task 8).

**Files:**
- Modify: `worker/config/type/schema.json`
- Modify: `worker/config/default.mjs`
- Modify: `worker/config/development.mjs`
- Modify: `worker/config/custom-environment-variables.mjs`
- Modify: `worker/src/config.ts`

- [ ] **Step 1: Add the new properties to the worker config schema**

In `worker/config/type/schema.json`:

In the top-level `required` array, add `"privateRegistryUrl"`.

In `properties`, add after `privateEventsUrl`:

```json
    "privateRegistryUrl": {
      "type": "string",
      "pattern": "^https?://",
      "description": "Internal URL used by the worker to call the registry server-to-server."
    },
```

In `properties.secretKeys`, add a `required` array and a `registry` property so the `secretKeys` object reads:

```json
    "secretKeys": {
      "type": "object",
      "required": [
        "registry"
      ],
      "properties": {
        "events": {
          "type": "string"
        },
        "registry": {
          "type": "string",
          "description": "x-secret-key shared with the registry."
        }
      }
    },
```

- [ ] **Step 2: Add defaults in `worker/config/default.mjs`**

In `worker/config/default.mjs`, add `privateRegistryUrl` after `privateDataFairUrl`... add it after `privateEventsUrl`:

```js
  privateEventsUrl: undefined,
  privateRegistryUrl: 'http://registry:8080',
```

And update `secretKeys`:

```js
  secretKeys: {
    events: undefined,
    registry: undefined
  },
```

- [ ] **Step 3: Add dev values in `worker/config/development.mjs`**

In `worker/config/development.mjs`, add a `registryPort` constant alongside the other port constants:

```js
const registryPort = process.env.REGISTRY_PORT ?? '8089'
```

Add `privateRegistryUrl` after `privateEventsUrl` in the exported object:

```js
  privateEventsUrl: `http://localhost:${eventsPort}`,
  privateRegistryUrl: `http://localhost:${registryPort}`,
```

And update `secretKeys`:

```js
  secretKeys: {
    events: 'secret-events',
    registry: 'secret-registry-internal'
  }
```

- [ ] **Step 4: Map the env vars in `worker/config/custom-environment-variables.mjs`**

In `worker/config/custom-environment-variables.mjs`, add `privateRegistryUrl` after `privateEventsUrl`:

```js
  privateEventsUrl: 'PRIVATE_EVENTS_URL',
  privateRegistryUrl: 'PRIVATE_REGISTRY_URL',
```

And update `secretKeys`:

```js
  secretKeys: {
    events: 'SECRET_EVENTS',
    registry: 'SECRET_REGISTRY'
  },
```

- [ ] **Step 5: Regenerate config types**

Run: `npm run build-types`
Expected: completes without error; `worker/config/type/.type/` is updated.

- [ ] **Step 6: Add the `tmpDir` fallback and `registryCacheDir` export in `worker/src/config.ts`**

Replace the entire contents of `worker/src/config.ts` with:

```ts
import path from 'node:path'
import os from 'node:os'
import type { WorkerConfig } from '../config/type/index.ts'
import { assertValid } from '../config/type/index.ts'
import config from 'config'

assertValid(config, { lang: 'en', name: 'config', internal: true })

const rawConfig = config as unknown as WorkerConfig

// tmpDir defaults to <dataDir>/tmp when dataDir is set, else an OS temp dir.
if (!rawConfig.tmpDir) {
  rawConfig.tmpDir = rawConfig.dataDir
    ? path.join(rawConfig.dataDir, 'tmp')
    : path.join(os.tmpdir(), 'data-fair-catalogs')
}

const workerConfig = rawConfig as WorkerConfig & { tmpDir: string }
export default workerConfig

// The registry artefact cache always lives under tmpDir.
export const registryCacheDir = path.join(workerConfig.tmpDir, 'registry-cache')
```

- [ ] **Step 7: Type-check**

Run: `npm run check-types`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add worker/config worker/src/config.ts
git commit -m "feat: add registry config to the worker"
```

---

## Task 4: Add the `@data-fair/lib-node-registry` dependency

Adds the registry client to the API and worker, plus `tar-stream` to the worker (used by the upgrade script in Task 9).

**Files:**
- Modify: `api/package.json`
- Modify: `worker/package.json`
- Modify: `package-lock.json` (regenerated by `npm install`)

- [ ] **Step 1: Add the dependency to `api/package.json`**

In `api/package.json`, in `dependencies`, add (keep alphabetical order):

```json
    "@data-fair/lib-node-registry": "^0.4.0",
```

- [ ] **Step 2: Add the dependencies to `worker/package.json`**

In `worker/package.json`, in `dependencies`, add:

```json
    "@data-fair/lib-node-registry": "^0.4.0",
    "tar-stream": "^3.1.7",
```

In `worker/package.json`, in `devDependencies`, add:

```json
    "@types/tar-stream": "^3.1.4",
```

- [ ] **Step 3: Install**

Run: `npm install`
Expected: completes; `package-lock.json` updated; `node_modules/@data-fair/lib-node-registry` exists.

- [ ] **Step 4: Verify the package resolves**

Run: `node -e "import('@data-fair/lib-node-registry').then(m => console.log(typeof m.ensureArtefact))"`
Expected: prints `function`.

- [ ] **Step 5: Commit**

```bash
git add api/package.json worker/package.json package-lock.json
git commit -m "chore: add @data-fair/lib-node-registry dependency"
```

---

## CHECKPOINT A — restart the dev environment

Tasks 1–4 changed `docker-compose.yml`, the nginx template, `.mjs` config files and `node_modules`. None of these hot-reload. **Stop and ask the user:**

> "Tasks 1–4 are done. Please restart the dev environment so the registry comes up and the new config loads:
> 1. Restart docker compose (stop and re-run `npm run dev-deps`) — this starts the new `registry` container.
> 2. Restart the dev API and dev worker zellij panes.
>
> Then run `bash dev/status.sh` and confirm `registry` shows **UP**. Also confirm `dev-api` shows UP (it now requires `privateRegistryUrl` + `secretKeys.registry`, both provided by `development.mjs`). Tell me when it's ready."

Do not proceed past this checkpoint until the user confirms the registry and dev API are up. If the dev API is down, read `dev/logs/dev-api.log`; if the registry is down, read `dev/logs/docker-compose.log`.

---

## Task 5: Shared plugin loader

A small helper that resolves and dynamic-imports a plugin's entry point. Unit-tested.

**Files:**
- Create: `shared/plugin-load.ts`
- Test: `tests/features/shared/plugin-load.unit.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/features/shared/plugin-load.unit.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { importPluginModule } from '@data-fair/catalogs-shared/plugin-load.ts'

test.describe('importPluginModule', () => {
  test('imports the entry point named by package.json#main', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'plugin-load-test-'))
    try {
      await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0', main: 'entry.js' }))
      await writeFile(path.join(dir, 'entry.js'), 'export default { hello: "world" }')
      const mod = await importPluginModule<{ default: { hello: string } }>(dir)
      expect(mod.default.hello).toBe('world')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('defaults to index.js when package.json has no main', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'plugin-load-test-'))
    try {
      await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0' }))
      await writeFile(path.join(dir, 'index.js'), 'export default { ok: true }')
      const mod = await importPluginModule<{ default: { ok: boolean } }>(dir)
      expect(mod.default.ok).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('throws when the entry point file is missing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'plugin-load-test-'))
    try {
      await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0', main: 'nope.js' }))
      await expect(importPluginModule(dir)).rejects.toThrow(/missing/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/features/shared/plugin-load.unit.spec.ts --project unit`
Expected: FAIL — `Cannot find module '@data-fair/catalogs-shared/plugin-load.ts'`.

- [ ] **Step 3: Write the implementation**

Create `shared/plugin-load.ts`:

```ts
import path from 'node:path'
import { readFile, access } from 'node:fs/promises'

/**
 * Resolve a plugin's entry point from its package.json#main and dynamic-import it.
 *
 * Plugins can ship pre-built JS (main: "index.js") or rely on Node's built-in
 * type-stripping (main: "index.ts"). Callers must not hard-code an extension —
 * read main and trust it. Defaults to "index.js" when main is absent.
 *
 * `cacheBust` appends a query string so the same module path can be re-imported
 * fresh in the same process.
 */
export const importPluginModule = async <T = unknown> (
  pluginDir: string,
  opts: { cacheBust?: boolean } = {}
): Promise<T> => {
  const pkg = JSON.parse(await readFile(path.join(pluginDir, 'package.json'), 'utf8'))
  const mainRel = typeof pkg.main === 'string' && pkg.main.length > 0 ? pkg.main : 'index.js'
  const mainAbs = path.resolve(pluginDir, mainRel)
  try {
    await access(mainAbs)
  } catch {
    throw new Error(`plugin entry point missing: ${mainAbs}`)
  }
  const url = opts.cacheBust ? `${mainAbs}?imported=${Date.now()}` : mainAbs
  return (await import(url)) as T
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/features/shared/plugin-load.unit.spec.ts --project unit`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/plugin-load.ts tests/features/shared/plugin-load.unit.spec.ts
git commit -m "feat: add shared importPluginModule helper"
```

---

## Task 6: Test helper for the registry

Creates a helper that publishes/deletes the mock plugin in the dev registry. New file only — breaks nothing.

**Files:**
- Create: `tests/support/registry.ts`

- [ ] **Step 1: Create the helper**

Create `tests/support/registry.ts`:

```ts
import fs from 'node:fs'
import path from 'node:path'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'

const devHost = process.env.DEV_HOST ?? 'localhost'
const nginxPort = process.env.NGINX_PORT ?? '5600'

export const registryUrl = `http://${devHost}:${nginxPort}/registry`
/** Matches the registry container's SECRET_INTERNAL_SERVICES in docker-compose.yml. */
const secretKey = 'secret-registry-internal'

/** Registry artefact id of the mock catalog plugin (matches catalog.plugin). */
export const mockPluginId = '@data-fair-catalog-mock-0'

const ax = axiosBuilder({ baseURL: registryUrl, headers: { 'x-secret-key': secretKey } })

/**
 * Publish the mock catalog plugin tarball to the dev registry, public, with a
 * title — idempotent (a repeat upload replaces the arch tarball slot).
 * Mock project: https://github.com/data-fair/catalog-mock
 */
export const publishMockPlugin = async () => {
  const tarballPath = path.join(import.meta.dirname, '..', 'fixtures', 'catalog-mock.tgz')
  const form = new FormData()
  form.append('architecture', process.arch)
  form.append('category', 'catalog')
  form.append('file', new Blob([fs.readFileSync(tarballPath)]), 'catalog-mock.tgz')
  await ax.post(`/api/v1/artefacts/npm/${encodeURIComponent(mockPluginId)}`, form, {
    validateStatus: s => s === 201
  })
  await ax.patch(`/api/v1/artefacts/${encodeURIComponent(mockPluginId)}`, {
    public: true,
    title: { fr: 'Mock', en: 'Mock' }
  })
}

/** Remove the mock catalog plugin from the dev registry. */
export const deleteMockPlugin = async () => {
  await ax.delete(`/api/v1/artefacts/${encodeURIComponent(mockPluginId)}`, {
    validateStatus: s => s === 204 || s === 404
  })
}
```

- [ ] **Step 2: Verify the helper publishes the plugin**

Run: `node --experimental-strip-types --no-warnings -e "import('./tests/support/registry.ts').then(async m => { await m.publishMockPlugin(); console.log('published OK'); })"`

(If `--experimental-strip-types` is rejected by the installed Node, run with `node` directly — Node 24 strips types natively: `node -e "..."`.)

Expected: prints `published OK`. Then verify the artefact is listed:

Run: `curl -s "http://$(grep DEV_HOST .env | cut -d= -f2):$(grep NGINX_PORT .env | cut -d= -f2)/registry/api/v1/artefacts?format=npm&category=catalog" -H "x-secret-key: secret-registry-internal"`
Expected: JSON whose `results` contains an artefact with `_id` `@data-fair-catalog-mock-0`.

- [ ] **Step 3: Commit**

```bash
git add tests/support/registry.ts
git commit -m "test: add registry test helper"
```

---

## Task 7: Switch plugin storage to the registry

The atomic backend switch: the API resolves plugins from the registry instead of the local volume. This task touches several files at once because the `getPlugin` signature change ripples through every caller — splitting it would leave the code uncompilable.

**Files:**
- Modify: `api/src/plugins/service.ts` (rewrite)
- Modify: `api/src/plugins/router.ts` (rewrite)
- Delete: `api/src/plugins/registry/router.ts`
- Modify: `api/src/app.ts`
- Modify: `api/src/catalogs/service.ts`
- Modify: `api/src/catalogs/router.ts`
- Modify: `api/src/admin/status.ts`
- Modify: `api/src/misc/routers/test-env.ts`
- Modify: `api/config/type/schema.json` and `api/config/default.mjs` (make `dataDir` optional)
- Modify: `api/doc/index.ts`
- Delete: `api/doc/plugins/` (whole directory)
- Modify: `tests/support/axios.ts`
- Delete: `tests/features/plugins/install.api.spec.ts`
- Delete + recreate: `tests/features/plugins/registry.api.spec.ts`

- [ ] **Step 1: Write the new failing api test**

Delete the obsolete spec files:

```bash
git rm tests/features/plugins/install.api.spec.ts tests/features/plugins/registry.api.spec.ts
```

Create a new `tests/features/plugins/registry.api.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { axios, axiosAuth } from '../../support/axios.ts'
import { publishMockPlugin } from '../../support/registry.ts'

const pluginId = '@data-fair-catalog-mock-0'
const axAno = axios()

test.describe('plugins resolved from the registry', () => {
  test.beforeAll(async () => {
    await publishMockPlugin()
  })

  test('returns a plugin descriptor with its schemas and metadata', async () => {
    const adminOrg = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
    const res = await adminOrg.get('/api/plugins/' + pluginId)
    expect(res.data.id).toBe(pluginId)
    expect(res.data.name).toBe('@data-fair/catalog-mock')
    expect(res.data.version).toBeTruthy()
    expect(res.data.configSchema).toBeTruthy()
    expect(res.data.metadata.capabilities).toBeTruthy()
  })

  test('returns 404 for an unknown plugin', async () => {
    const adminOrg = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
    await expect(adminOrg.get('/api/plugins/does-not-exist-0')).rejects.toMatchObject({ status: 404 })
  })

  test('rejects anonymous and non-admin callers', async () => {
    const userOrg = await axiosAuth({ email: 'test_user1@test.com', org: 'test_org1' })
    await expect(axAno.get('/api/plugins/' + pluginId)).rejects.toMatchObject({ status: 401 })
    await expect(userOrg.get('/api/plugins/' + pluginId)).rejects.toMatchObject({ status: 403 })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/features/plugins/registry.api.spec.ts --project api`
Expected: FAIL — the current `GET /api/plugins/:id` reads `plugin.json` from the local volume and returns 404, or the response shape differs.

- [ ] **Step 3: Rewrite `api/src/plugins/service.ts`**

Replace the entire contents of `api/src/plugins/service.ts` with:

```ts
import type CatalogPlugin from '@data-fair/types-catalogs'

import path from 'node:path'
import fs from 'fs-extra'
import { httpError } from '@data-fair/lib-express'
import { ensureArtefact } from '@data-fair/lib-node-registry'
import { importPluginModule } from '@data-fair/catalogs-shared/plugin-load.ts'
import config, { registryCacheDir } from '#config'

fs.ensureDirSync(registryCacheDir)

/** Minimal account shape forwarded to the registry for access control. */
export type PluginAccount = { type: 'user' | 'organization', id: string, department?: string }

/** Subset of the plugin's package.json the API surfaces to the UI. */
export type PluginPackage = { name: string, description?: string, version: string }

/**
 * Resolve a plugin from the registry.
 *
 * `ensureArtefact` downloads + extracts the artefact tarball into the local
 * cache on a miss (the cache is keyed by the artefact's dataUpdatedAt), and
 * returns the cached path on a hit. `account` is forwarded so the registry can
 * enforce private-artefact access; its 403/404 surface unchanged.
 *
 * Returns the imported `CatalogPlugin` module default export plus the plugin's
 * package.json fields (name/description/version).
 */
export const getPlugin = async (
  artefactId: string,
  account?: PluginAccount
): Promise<{ plugin: CatalogPlugin, pkg: PluginPackage }> => {
  if (!artefactId) throw httpError(400, 'Plugin ID is required')

  let ensured
  try {
    ensured = await ensureArtefact({
      registryUrl: config.privateRegistryUrl,
      secretKey: config.secretKeys.registry,
      artefactId,
      cacheDir: registryCacheDir,
      architecture: process.arch,
      account: account
        ? { type: account.type, id: account.id, ...(account.department ? { department: account.department } : {}) }
        : undefined
    })
  } catch (e: any) {
    const status = e.status ?? e.statusCode ?? e.response?.status
    if (status === 404) throw httpError(404, `Plugin ${artefactId} not found`)
    if (status === 403) throw httpError(403, `Access denied to plugin ${artefactId}`)
    throw e
  }

  const pkg = await fs.readJson(path.join(ensured.path, 'package.json')) as PluginPackage
  const mod = await importPluginModule<{ default: CatalogPlugin }>(ensured.path)
  const plugin = mod.default

  // For compatibility with older plugins
  if (plugin.listResources && !plugin.list) plugin.list = plugin.listResources

  return { plugin, pkg }
}
```

- [ ] **Step 4: Rewrite `api/src/plugins/router.ts`**

Replace the entire contents of `api/src/plugins/router.ts` with:

```ts
import type { Plugin } from '#types'

import { Router } from 'express'
import { assertAccountRole, session } from '@data-fair/lib-express'
import { getPlugin } from './service.ts'

const router = Router()
export default router

// Get a plugin descriptor (schemas + metadata) resolved from the registry.
// The plugin list itself is read by the UI directly from the registry API.
router.get('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  const { plugin, pkg } = await getPlugin(req.params.id, sessionState.account)

  res.send({
    id: req.params.id,
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    configSchema: plugin.configSchema,
    listFiltersSchema: plugin.listFiltersSchema,
    importFiltersSchema: plugin.importFiltersSchema,
    publicationFiltersSchema: plugin.publicationFiltersSchema,
    importConfigSchema: plugin.importConfigSchema,
    metadata: plugin.metadata
  } as Plugin)
})
```

- [ ] **Step 5: Delete the npm-search router and update `app.ts`**

```bash
git rm api/src/plugins/registry/router.ts
```

In `api/src/app.ts`, remove the import line:

```ts
import pluginsRegistryRouter from './plugins/registry/router.ts'
```

and remove the mount line:

```ts
app.use('/api/plugins-registry', pluginsRegistryRouter)
```

Leave `import pluginRouter from './plugins/router.ts'` and `app.use('/api/plugins', pluginRouter)` in place.

- [ ] **Step 6: Update the `getPlugin` callers in `api/src/catalogs/service.ts`**

In `api/src/catalogs/service.ts`, in `validateCatalog`, replace:

```ts
  const validCatalog = (await import('#types/catalog/index.ts')).returnValid(catalog)
  const plugin: CatalogPlugin = await getPlugin(validCatalog.plugin)
  plugin.assertConfigValid(validCatalog.config)
  return validCatalog
```

with:

```ts
  const validCatalog = (await import('#types/catalog/index.ts')).returnValid(catalog)
  const { plugin } = await getPlugin(validCatalog.plugin, validCatalog.owner)
  plugin.assertConfigValid(validCatalog.config)
  return validCatalog
```

In `prepareCatalog`, replace:

```ts
  const plugin = await getPlugin(catalog.plugin)
```

with:

```ts
  const { plugin } = await getPlugin(catalog.plugin, catalog.owner)
```

If the `import type CatalogPlugin from '@data-fair/types-catalogs'` import becomes unused after this change, remove it (the type-check step will flag it via lint).

- [ ] **Step 7: Update the `getPlugin` callers in `api/src/catalogs/router.ts`**

In `api/src/catalogs/router.ts`, in the `POST /` handler, replace:

```ts
  const plugin = await getPlugin(catalog.plugin)
  catalog.capabilities = plugin.metadata.capabilities
```

with:

```ts
  const { plugin } = await getPlugin(catalog.plugin, catalog.owner)
  catalog.capabilities = plugin.metadata.capabilities
```

In the `GET /:id/resources` handler, replace:

```ts
  const plugin = await getPlugin(catalog.plugin)
  const datasets = await plugin.list({
```

with:

```ts
  const { plugin } = await getPlugin(catalog.plugin, catalog.owner)
  const datasets = await plugin.list({
```

- [ ] **Step 8: Make `dataDir` optional in the API config**

In `api/config/type/schema.json`, change the `dataDir` property to allow null:

```json
    "dataDir": {
      "type": ["string", "null"],
      "description": "Optional. When set, the legacy plugins volume at <dataDir>/plugins is read by the v1.0.0 boot migration. Removed in v2.0.0."
    },
```

and remove `"dataDir"` from the top-level `required` array.

In `api/config/default.mjs`, change `dataDir: '/app/data'` to:

```js
  dataDir: null,
```

(Leave `api/config/development.mjs` `dataDir: '../data/development'` unchanged — dev keeps a dataDir so the migration can run.)

Run: `npm run build-types`
Expected: completes; `ApiConfig.dataDir` is now `string | null`.

- [ ] **Step 9: Make the data-volume health check conditional in `api/src/admin/status.ts`**

In `api/src/admin/status.ts`, replace:

```ts
const volumeStatus = async () => {
  await fs.writeFile(`${config.dataDir}/check-access.txt`, 'ok')
}
```

with:

```ts
const volumeStatus = async () => {
  // dataDir is optional once plugins live in the registry — skip the check
  // when it is not configured.
  if (!config.dataDir) return
  await fs.writeFile(`${config.dataDir}/check-access.txt`, 'ok')
}
```

- [ ] **Step 10: Point the test-env plugins endpoint at the registry cache**

In `api/src/misc/routers/test-env.ts`, replace the `DELETE /plugins` handler:

```ts
// Wipe the installed plugins directory (used between test runs).
router.delete('/plugins', async (req, res, next) => {
  try {
    const pluginsDir = path.resolve(config.dataDir, 'plugins')
    await fs.emptyDir(pluginsDir)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
```

with:

```ts
// Wipe the local registry artefact cache (used between test runs).
router.delete('/plugins', async (req, res, next) => {
  try {
    const { registryCacheDir } = await import('#config')
    await fs.emptyDir(registryCacheDir)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})
```

If the `path` import becomes unused in `test-env.ts`, remove the `import path from 'node:path'` line (the lint step will flag it).

- [ ] **Step 11: Delete the plugin request/response doc schemas**

```bash
git rm -r api/doc/plugins
```

In `api/doc/index.ts`, remove these two lines:

```ts
export type { PluginPost } from './plugins/post-req/index.ts'
export type { PluginsGetRes } from './plugins/get-res/index.ts'
```

Then search for any remaining importers of those types:

Run: `grep -rn "PluginPost\|PluginsGetRes" api ui worker tests --include='*.ts' --include='*.vue'`
Expected: no matches. If there are matches, they are dead references — remove them.

- [ ] **Step 12: Rewire the test helpers in `tests/support/axios.ts`**

In `tests/support/axios.ts`:

Remove the now-unused imports `fs`, `path`, `FormData` from the top of the file **only if** they become unused after the next edits — keep them for now and let the lint step decide.

Replace the `installMockPlugin` function:

```ts
/**
 * Install the mock catalog plugin used by the API tests.
 * Mock project: https://github.com/data-fair/catalog-mock
 */
export const installMockPlugin = async () => {
  const superadmin = await axiosAuth('test_superadmin@test.com')
  const tarballPath = path.join(import.meta.dirname, '..', 'fixtures', 'catalog-mock.tgz')
  const formData = new FormData()
  formData.append('file', fs.createReadStream(tarballPath))
  await superadmin.post('/api/plugins', formData, { headers: formData.getHeaders() })
}
```

with:

```ts
/**
 * Publish the mock catalog plugin used by the API tests to the dev registry.
 * Mock project: https://github.com/data-fair/catalog-mock
 */
export const installMockPlugin = async () => {
  await publishMockPlugin()
}
```

And add this import near the other imports at the top of the file:

```ts
import { publishMockPlugin } from './registry.ts'
```

`cleanPlugins` is unchanged — it still calls `DELETE /api/test-env/plugins`, which now wipes the registry cache.

After these edits, remove any imports left unused (`fs`, `path`, `FormData`) — the lint step in Step 14 will report them.

- [ ] **Step 13: Run the api tests**

Run: `npx playwright test tests/features/plugins/registry.api.spec.ts --project api`
Expected: PASS (3 tests).

Run: `npx playwright test tests/features/catalogs/permissions.api.spec.ts --project api`
Expected: PASS (catalog creation still resolves the mock plugin, now from the registry).

- [ ] **Step 14: Type-check and lint**

Run: `npm run check-types`
Expected: PASS.

Run: `npm run lint`
Expected: PASS (fix any unused-import warnings it reports).

- [ ] **Step 15: Commit**

```bash
git add -A
git commit -m "feat!: resolve catalog plugins from the registry instead of the local volume"
```

---

## Task 8: Worker resolves plugins from the registry

Replaces the worker's `<dataDir>/plugins` read with `ensureArtefact`, and makes the worker's `dataDir` optional.

**Files:**
- Modify: `worker/src/worker.ts`
- Modify: `worker/src/lib/import.ts`
- Modify: `worker/config/type/schema.json` and `worker/config/default.mjs` (make `dataDir` optional)

There is no automated worker test harness in this repo (import/publication runs need live data-fair datasets). This task is verified by type-check, lint, a clean worker boot, and the manual smoke test in Step 7.

- [ ] **Step 1: Make `dataDir` optional in the worker config**

In `worker/config/type/schema.json`, change the `dataDir` property:

```json
    "dataDir": {
      "type": ["string", "null"],
      "description": "Optional. When set, the legacy plugins volume at <dataDir>/plugins is read by the v1.0.0 boot migration. Removed in v2.0.0."
    },
```

and remove `"dataDir"` from the top-level `required` array.

In `worker/config/default.mjs`, change `dataDir: '/app/data'` to `dataDir: null`. Leave `worker/config/development.mjs` `dataDir: '../data/development'` unchanged.

Run: `npm run build-types`
Expected: completes; `WorkerConfig.dataDir` is now `string | null`.

- [ ] **Step 2: Replace the plugin-loading block in `worker/src/worker.ts`**

In `worker/src/worker.ts`, add these imports near the existing imports (after `import upgradeScripts ...`):

```ts
import { ensureArtefact } from '@data-fair/lib-node-registry'
import { importPluginModule } from '@data-fair/catalogs-shared/plugin-load.ts'
```

Change the config import line:

```ts
import config from '#config'
```

to:

```ts
import config, { registryCacheDir } from '#config'
```

In the `iter()` function, replace this block:

```ts
  const pluginJsonPath = path.resolve(config.dataDir, 'plugins', catalog.plugin, 'plugin.json')
  const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'))
  const pluginPath = path.resolve(config.dataDir, 'plugins', catalog.plugin, pluginJson.version, 'index.ts')
  const plugin: CatalogPlugin = (await import(pluginPath)).default
  if (!plugin) {
    await collection.updateOne(
      { _id: task._id },
      { $set: { status: 'error', logs: [{ type: 'error', msg: 'Plugin not found', date: new Date().toISOString() }] } }
    )
    return internalError('worker-missing-plugin', `found a task using the missing plugin ${catalog.plugin} (${pluginJson.version}), weird`)
  }
  debug(`Using plugin ${pluginJson.name} (${pluginJson.version})`)
```

with:

```ts
  // Resolve the plugin from the registry: ensureArtefact downloads + extracts
  // the tarball into the local cache on a miss, returns the cached path on a
  // hit. The catalog owner is forwarded so the registry enforces its access.
  let plugin: CatalogPlugin
  try {
    const ensured = await ensureArtefact({
      registryUrl: config.privateRegistryUrl,
      secretKey: config.secretKeys.registry,
      artefactId: catalog.plugin,
      cacheDir: registryCacheDir,
      architecture: process.arch,
      account: {
        type: catalog.owner.type,
        id: catalog.owner.id,
        ...(catalog.owner.department ? { department: catalog.owner.department } : {})
      }
    })
    const mod = await importPluginModule<{ default: CatalogPlugin }>(ensured.path)
    plugin = mod.default
    if (plugin.listResources && !plugin.list) plugin.list = plugin.listResources
  } catch (e: any) {
    const status = e.status ?? e.statusCode ?? e.response?.status
    const msg = (status === 404 || status === 403)
      ? `Le plugin ${catalog.plugin} n'est plus disponible (supprimé ou accès retiré).`
      : `Erreur lors du chargement du plugin ${catalog.plugin}`
    await collection.updateOne(
      { _id: task._id },
      { $set: { status: 'error', logs: [{ type: 'error', msg, date: new Date().toISOString() }] } }
    )
    await wsEmit(`${type}/${task._id}`, { status: 'error' })
    return internalError('worker-missing-plugin', `${msg} (task ${task._id})`)
  }
  debug(`Using plugin ${catalog.plugin}`)
```

- [ ] **Step 3: Make the worker boot guard tolerant of an absent dataDir**

In `worker/src/worker.ts`, in the `start()` function, replace:

```ts
  if (!fs.existsSync(config.dataDir)) throw new Error(`Data directory ${resolvePath(config.dataDir)} was not mounted`)
```

with:

```ts
  if (config.dataDir && !fs.existsSync(config.dataDir)) throw new Error(`Data directory ${resolvePath(config.dataDir)} was not mounted`)
```

- [ ] **Step 4: Simplify `baseTmpDir` in `worker/src/lib/import.ts`**

In `worker/src/lib/import.ts`, replace:

```ts
const baseTmpDir = config.tmpDir || path.join(config.dataDir, 'tmp')
```

with:

```ts
// config.ts guarantees tmpDir is always set.
const baseTmpDir = config.tmpDir
```

- [ ] **Step 5: Remove now-unused imports in `worker/src/worker.ts`**

After Step 2, `path`, `fs` and `resolvePath` may still be used elsewhere in `worker.ts` (`resolvePath` is used in the `start()` guard; check `path`/`fs`). Run the type-check and lint steps below; remove any import they report as unused. Do not remove `import type CatalogPlugin` — it is still used by the `let plugin: CatalogPlugin` annotation.

- [ ] **Step 6: Type-check and lint**

Run: `npm run check-types`
Expected: PASS.

Run: `npm run lint`
Expected: PASS (fix any unused-import warnings).

- [ ] **Step 7: Manual smoke test of the worker**

The worker hot-reloads on the `.ts` edits. Verify it booted cleanly:

Run: `tail -n 30 dev/logs/dev-worker.log`
Expected: no crash; the worker is polling (look for worker-loop debug lines, no stack trace).

Then run a catalog resource exploration end-to-end through the API (this exercises `getPlugin` → registry on the API side, confirming the mock plugin resolves and lists):

Run: `npx playwright test tests/features/catalogs/permissions.api.spec.ts --project api`
Expected: PASS.

> A full import/publication run requires live data-fair datasets and has no automated coverage in this repo. If the user wants to verify a worker run, they can create a catalog from the mock plugin in the UI and trigger an import; the worker log should show `Using plugin @data-fair-catalog-mock-0` and no "plugin not available" error.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat!: worker resolves catalog plugins from the registry"
```

---

## Task 9: v1.0.0 upgrade script — publish legacy plugins to the registry

A boot migration that repacks each plugin still on the legacy `<dataDir>/plugins` volume and uploads it to the registry.

**Files:**
- Create: `upgrade/1.0.0/01-publish-plugins-to-registry.ts`
- Delete: `upgrade/.empty`

This one-shot migration is awkward to cover with the Playwright harness; it is verified by type-check, lint and the manual procedure in Step 4 (the same approach the sister processings service took).

- [ ] **Step 1: Create the upgrade script**

Create `upgrade/1.0.0/01-publish-plugins-to-registry.ts`:

```ts
import type { UpgradeScript } from '@data-fair/lib-node/upgrade-scripts.js'
import { existsSync, createReadStream, createWriteStream } from 'node:fs'
import { readdir, readFile, lstat, readlink, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { arch as hostArch } from 'node:process'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import * as tarStream from 'tar-stream'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { importPluginModule } from '@data-fair/catalogs-shared/plugin-load.ts'
import config from '../../worker/src/config.ts'

type PluginJson = { id: string, name: string, version: string, description?: string }

/**
 * Repack a directory into a gzipped tarball at `tarballPath`, prefixing every
 * entry with `package/` (the npm tarball convention the registry expects).
 * node_modules is included so registry consumers get a runnable bundle;
 * symlinks are preserved as symlinks.
 */
async function packPluginDir (pluginDir: string, tarballPath: string): Promise<void> {
  const pack = tarStream.pack()
  const writeDone = pipeline(pack, createGzip(), createWriteStream(tarballPath))

  const addEntry = (header: tarStream.Headers, body?: string): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      const cb = (err?: Error | null) => err ? reject(err) : resolve()
      if (body !== undefined) { pack.entry(header, body, cb); return }
      // Non-file entries (symlinks) carry no body — the linkname is in the header.
      if (header.type && header.type !== 'file') { pack.entry(header, cb).end(); return }
      const entry = pack.entry(header, cb)
      entry.on('error', reject)
      createReadStream(path.join(pluginDir, header.name.replace(/^package\//, '')))
        .on('error', reject)
        .pipe(entry)
    })

  const walk = async (relPath: string): Promise<void> => {
    const fullPath = path.join(pluginDir, relPath)
    const st = await lstat(fullPath)
    const tarName = `package/${relPath}`
    if (st.isDirectory()) {
      for (const child of await readdir(fullPath)) await walk(`${relPath}/${child}`)
    } else if (st.isFile()) {
      await addEntry({ name: tarName, size: st.size, mode: st.mode, mtime: st.mtime, type: 'file' })
    } else if (st.isSymbolicLink()) {
      await addEntry({ name: tarName, type: 'symlink', linkname: await readlink(fullPath), mode: st.mode, mtime: st.mtime })
    }
    // sockets/devices/etc — not relevant for plugin tarballs, skip silently
  }

  for (const child of await readdir(pluginDir)) await walk(child)
  pack.finalize()
  await writeDone
}

export default {
  description: 'v1.0.0 — publish legacy on-disk catalog plugins into the registry',
  async exec (_db, debug) {
    if (!config.dataDir) {
      debug('dataDir unset — nothing to migrate')
      return
    }
    const pluginsDir = path.join(config.dataDir, 'plugins')
    if (!existsSync(pluginsDir)) {
      debug('legacy plugins volume absent — nothing to migrate')
      return
    }

    const ax = axiosBuilder({
      baseURL: config.privateRegistryUrl.replace(/\/$/, ''),
      headers: { 'x-secret-key': config.secretKeys.registry }
    })

    const entries = await readdir(pluginsDir, { withFileTypes: true })
    const failures: { dir: string, error: string }[] = []

    for (const entry of entries) {
      const dir = entry.name
      if (!entry.isDirectory()) continue
      try {
        const pluginJsonPath = path.join(pluginsDir, dir, 'plugin.json')
        if (!existsSync(pluginJsonPath)) {
          debug(`${dir}: no plugin.json, skipping`)
          continue
        }
        const pluginJson = JSON.parse(await readFile(pluginJsonPath, 'utf8')) as PluginJson
        if (!pluginJson.name || !pluginJson.version) {
          debug(`${dir}: malformed plugin.json, skipping`)
          continue
        }
        // The artefact id is the legacy plugin directory name — exactly what
        // catalog.plugin already references, so catalogs need no data migration.
        const artefactId = dir
        const versionDir = path.join(pluginsDir, dir, pluginJson.version)
        if (!existsSync(versionDir)) {
          debug(`${dir}: version directory ${pluginJson.version} missing, skipping`)
          continue
        }

        // Probe: skip if this arch slot is already published (idempotent).
        const probe = await ax.get(`/api/v1/artefacts/${encodeURIComponent(artefactId)}`, {
          validateStatus: s => s === 200 || s === 404
        })
        if (probe.status === 200 && probe.data?.tarballs?.[hostArch]) {
          debug(`${dir}: already published for ${hostArch}, skipping`)
          continue
        }

        const stagingDir = await mkdtemp(path.join(os.tmpdir(), 'catalogs-migrate-'))
        const tarballPath = path.join(stagingDir, `${dir}.tgz`)
        try {
          await packPluginDir(versionDir, tarballPath)

          const form = new FormData()
          form.append('architecture', hostArch)
          form.append('category', 'catalog')
          form.append('file', new Blob([await readFile(tarballPath)]), 'package.tgz')
          debug(`${dir}: uploading ${pluginJson.name}@${pluginJson.version} as ${artefactId} (${hostArch})`)
          await ax.post(`/api/v1/artefacts/npm/${encodeURIComponent(artefactId)}`, form, {
            validateStatus: s => s === 201
          })
          // Preserve today's "every account-admin can use every plugin".
          await ax.patch(`/api/v1/artefacts/${encodeURIComponent(artefactId)}`, { public: true })
          debug(`${dir}: published`)

          // Best-effort: publish the in-tarball thumbnail to the registry so
          // the picker shows an icon for migrated plugins.
          try {
            const mod = await importPluginModule<{ default: { metadata?: { thumbnailPath?: string } } }>(versionDir)
            const thumbnailPath = mod.default?.metadata?.thumbnailPath
            if (thumbnailPath) {
              const thumbAbs = path.join(versionDir, thumbnailPath)
              if (existsSync(thumbAbs)) {
                const tform = new FormData()
                tform.append('file', new Blob([await readFile(thumbAbs)]), path.basename(thumbnailPath))
                await ax.post(`/api/v1/artefacts/${encodeURIComponent(artefactId)}/thumbnail`, tform, {
                  validateStatus: s => s === 201
                })
                debug(`${dir}: thumbnail uploaded`)
              }
            }
          } catch (err: any) {
            debug(`${dir}: thumbnail upload skipped (${err?.message ?? err})`)
          }
        } finally {
          await rm(stagingDir, { recursive: true, force: true })
        }
      } catch (err: any) {
        const msg = err?.response
          ? `${err.response.status}: ${JSON.stringify(err.response.data)}`
          : (err?.message ?? String(err))
        debug(`${dir}: migration failed (${msg}) — left on volume for manual reconciliation`)
        failures.push({ dir, error: msg })
      }
    }

    if (failures.length) {
      debug(`${failures.length} plugin(s) failed migration: ${failures.map(f => f.dir).join(', ')}. Reconcile manually.`)
    }
  }
} as UpgradeScript
```

- [ ] **Step 2: Remove the upgrade-directory placeholder**

```bash
git rm upgrade/.empty
```

- [ ] **Step 3: Type-check and lint**

Run: `npm run check-types`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual verification of the migration**

The upgrade-scripts runner records completion in mongo, so the migration runs once per environment. To verify it on a clean slate:

1. Delete the mock artefact from the registry so the migration has something to publish:
   ```bash
   node -e "import('./tests/support/registry.ts').then(m => m.deleteMockPlugin()).then(() => console.log('deleted'))"
   ```
2. Create a legacy plugin directory the migration will find. The dev worker's `dataDir` is `../data/development`:
   ```bash
   mkdir -p ../data/development/plugins/@data-fair-catalog-mock-0/0.4.0
   tar -xzf tests/fixtures/catalog-mock.tgz -C ../data/development/plugins/@data-fair-catalog-mock-0/0.4.0 --strip-components=1
   printf '{"id":"@data-fair-catalog-mock-0","name":"@data-fair/catalog-mock","version":"0.4.0"}' > ../data/development/plugins/@data-fair-catalog-mock-0/plugin.json
   ```
3. Drop the recorded upgrade state so the script re-runs, then ask the user to restart the dev worker zellij pane:
   ```bash
   node -e "import('mongodb').then(async ({MongoClient}) => { const p=process.env.MONGO_PORT; const c=new MongoClient('mongodb://localhost:'+p+'/data-fair-catalogs-development'); await c.connect(); await c.db().collection('upgrades').deleteMany({}); await c.close(); console.log('upgrade state cleared'); })"
   ```
   (If the `upgrades` collection is named differently, list collections in the `data-fair-catalogs-development` db and clear the upgrade-tracking one.)
4. After the user restarts the dev worker, check the log:
   ```bash
   grep -i "publish\|migrat\|registry" dev/logs/dev-worker.log | tail -20
   ```
   Expected: lines showing the mock plugin was uploaded and published.
5. Confirm the artefact is in the registry:
   ```bash
   curl -s "http://$(grep DEV_HOST .env | cut -d= -f2):$(grep NGINX_PORT .env | cut -d= -f2)/registry/api/v1/artefacts?format=npm&category=catalog" -H "x-secret-key: secret-registry-internal"
   ```
   Expected: `results` contains `@data-fair-catalog-mock-0` with a `tarballs` entry and `public: true`.
6. Clean up the test fixture directory:
   ```bash
   rm -rf ../data/development/plugins/@data-fair-catalog-mock-0
   ```

If any step fails, read `dev/logs/dev-worker.log` for the migration's `debug` output and report it to the user.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: v1.0.0 upgrade script publishing legacy plugins to the registry"
```

---

## Task 10: Remove the admin plugins UI

Plugin install/update/uninstall now lives in the registry's own UI; the catalogs admin "Plugins" page is removed.

**Files:**
- Delete: `ui/src/pages/admin/` (whole directory — `index.vue`, `plugins.vue`)
- Modify: `ui/src/pages/dev.vue`

- [ ] **Step 1: Delete the admin pages**

```bash
git rm -r ui/src/pages/admin
```

- [ ] **Step 2: Remove the Plugins button from `ui/src/pages/dev.vue`**

In `ui/src/pages/dev.vue`, remove this `v-btn` block from the first `v-toolbar-items`:

```html
      <v-btn
        variant="text"
        href="/catalogs/admin/plugins"
        color="admin"
      >
        Plugins
      </v-btn>
```

- [ ] **Step 3: Find and remove any remaining references to the admin route**

Run: `grep -rn "admin/plugins\|pages/admin\|/admin'" ui/src --include='*.vue' --include='*.ts'`
Expected: no matches. If any remain (e.g. a nav link or router reference), remove them.

- [ ] **Step 4: Build the UI**

Run: `npm -w ui run build`
Expected: build succeeds with no unresolved-import errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat!: remove the admin plugins page (plugin management moves to the registry)"
```

---

## Task 11: Update the catalog-creation plugin picker

The picker lists plugins from the registry and lazily loads the selected plugin's schemas from `GET /api/plugins/:id`.

**Files:**
- Modify: `ui/src/pages/catalogs/new.vue`
- Test: `tests/features/catalogs/new.e2e.spec.ts` (create)

- [ ] **Step 1: Write the failing e2e test**

Create `tests/features/catalogs/new.e2e.spec.ts`:

```ts
import { test, expect } from '../../fixtures/login.ts'
import { cleanDb } from '../../support/axios.ts'
import { publishMockPlugin } from '../../support/registry.ts'

test.describe('catalog creation picker', () => {
  test.beforeAll(async () => {
    await publishMockPlugin()
  })
  test.beforeEach(cleanDb)

  test('lists registry plugins and opens the config step on selection', async ({ page, goToWithAuth }) => {
    await goToWithAuth('/catalogs/catalogs/new', 'test_admin1')
    // Step 1 — the picker card for the mock plugin (registry artefact title "Mock").
    const card = page.getByText(/Mock/).first()
    await expect(card).toBeVisible({ timeout: 10000 })
    await card.click()
    // Selecting a plugin advances to the configuration step and shows its form.
    await expect(page.getByText(/Configuration/i)).toBeVisible({ timeout: 10000 })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/features/catalogs/new.e2e.spec.ts --project e2e`
Expected: FAIL — `new.vue` still fetches `/api/plugins` (the removed list endpoint), so no card renders.

- [ ] **Step 3: Rewrite the `<script setup>` block of `ui/src/pages/catalogs/new.vue`**

Replace the entire `<script setup lang="ts"> ... </script>` block (lines 136–225) with:

```vue
<script setup lang="ts">
import type { Account } from '@data-fair/lib-common-types/session'
import type { Plugin } from '#api/types'
import type { CatalogPostReq } from '#api/doc'

import { computedAsync } from '@vueuse/core'
import Vjsf, { type Options as VjsfOptions } from '@koumoul/vjsf'
import DfLayoutFetchError from '@data-fair/lib-vuetify/layout-fetch-error.vue'
import OwnerPick from '@data-fair/lib-vuetify/owner-pick.vue'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { resolvedSchema as catalogSchemaBase } from '#api/types/catalog'

/** Subset of a registry artefact document used by the picker. */
interface RegistryArtefact {
  _id: string
  name: string
  packageName?: string
  version?: string
  title?: { fr?: string, en?: string }
  description?: { fr?: string, en?: string }
  thumbnail?: { id: string }
}

const session = useSessionAuthenticated()
const router = useRouter()
const { t } = useI18n()

// List catalog plugins straight from the registry — same domain, so the
// browser sends the SimpleDirectory session cookie and the registry
// access-filters the results.
const pluginsFetch = useFetch<{ results: RegistryArtefact[], count: number }>(
  `${$sitePath}/registry/api/v1/artefacts?format=npm&category=catalog&size=100`,
  { notifError: false }
)

const step = ref('1')
const newCatalog = ref<Partial<CatalogPostReq['body']>>({})
const newPlugin = ref<string | undefined>(undefined)
const newOwner = ref<Account | undefined>(session.state.account)
const ownersReady = ref(false)
const valid = ref(false)

// The registry list carries no config schema or metadata — fetch the full
// plugin descriptor from the catalogs API once a plugin is picked.
const pluginFetch = useFetch<Plugin>(() => `${$apiPath}/plugins/${newPlugin.value}`, {
  immediate: false,
  watch: false
})
watch(newPlugin, async (id) => {
  if (id) await pluginFetch.refresh()
})

/** Localized title/description of a registry artefact, with sensible fallbacks. */
const artefactTitle = (a: RegistryArtefact) =>
  a.title?.[session.lang.value as 'fr' | 'en'] || a.title?.fr || a.packageName || a.name
const artefactDescription = (a: RegistryArtefact) =>
  a.description?.[session.lang.value as 'fr' | 'en'] || a.description?.fr || ''
const artefactThumbnail = (a: RegistryArtefact) =>
  `${$sitePath}/registry/api/v1/artefacts/${encodeURIComponent(a._id)}/thumbnail`

/** `True` if the active account isn't in a department and his organization has departments */
const hasDepartments = computedAsync(async (): Promise<boolean> => {
  if (session.state.account.department || session.state.account.type === 'user') return false
  const org = await $fetch(`/simple-directory/api/organizations/${session.state.account.id}`, { baseURL: $sitePath })
  return !!org.departments?.length
}, false)

const catalogSchema = computed(() => {
  const plugin = pluginFetch.data.value
  if (!plugin) return
  const props = plugin.configSchema?.properties as Record<string, unknown> | undefined
  const hasConfig = !!props && Object.keys(props).length > 0

  catalogSchemaBase.layout.children = hasConfig
    ? ['title', 'description', 'config']
    : ['title', 'description']

  const builder = jsonSchema(catalogSchemaBase)
  if (hasConfig) {
    builder.addProperty('config', { ...plugin.configSchema, title: t('configuration') })
  }
  const schema = builder.schema
  schema.required = hasConfig ? ['title', 'config'] : ['title']
  return schema
})

const createCatalog = useAsyncAction(
  async () => {
    const catalog = await $fetch('/catalogs', {
      method: 'POST',
      body: {
        owner: newOwner.value,
        plugin: newPlugin.value,
        ...newCatalog.value,
        config: newCatalog.value.config ?? {}
      },
    })

    await router.replace({ path: `/catalogs/${catalog._id}` })
  },
  {
    error: t('errorCreatingCatalog'),
  }
)

setBreadcrumbs([{
  text: t('catalogs'),
  to: '/catalogs'
}, {
  text: t('createCatalog')
}])

const vjsfOptions: VjsfOptions = {
  context: {
    owner: newOwner.value
  },
  density: 'comfortable',
  initialValidation: 'always',
  locale: session.lang.value,
  titleDepth: 3,
  validateOn: 'blur',
  xI18n: true
}
</script>
```

- [ ] **Step 4: Update the picker template (Step 1 of the stepper) in `ui/src/pages/catalogs/new.vue`**

Replace the `v-row` block inside `<!-- Step 1: Select catalog type -->` (lines 51–82, the `<v-row class="d-flex align-stretch"> ... </v-row>`) with:

```vue
          <v-row class="d-flex align-stretch">
            <v-col
              v-for="artefact in pluginsFetch.data.value?.results"
              :key="artefact._id"
              md="4"
              sm="6"
              cols="12"
            >
              <v-card
                class="h-100"
                :color="newPlugin === artefact._id ? 'primary' : ''"
                @click="newPlugin = artefact._id; step = hasDepartments ? '2' : '3'"
              >
                <template #title>
                  <span :class="newPlugin !== artefact._id ? 'text-primary' : ''">
                    <!-- Remove 'Catalog ' from the title for compatibility -->
                    {{ t('catalog') }} {{ artefactTitle(artefact).replace('Catalog ', '') }}
                  </span>
                </template>
                <template #append>
                  <v-avatar
                    v-if="artefact.thumbnail"
                    :image="artefactThumbnail(artefact)"
                    rounded="0"
                    class="ml-2"
                    size="32"
                  />
                </template>
                <v-card-text>{{ artefactDescription(artefact) }}</v-card-text>
              </v-card>
            </v-col>
          </v-row>
```

(The `<!-- Step 3: Catalog configuration -->` stepper window item is unchanged — it still binds `:schema="catalogSchema"`, which is now driven by `pluginFetch`.)

- [ ] **Step 5: Build the UI**

Run: `npm -w ui run build`
Expected: build succeeds.

- [ ] **Step 6: Run the e2e test**

Run: `npx playwright test tests/features/catalogs/new.e2e.spec.ts --project e2e`
Expected: PASS.

- [ ] **Step 7: Type-check and lint**

Run: `npm run check-types`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat!: list catalog plugins from the registry in the creation picker"
```

---

## Task 12: Cleanup, dependency pruning, and version bump

Removes code and dependencies orphaned by the switch, bumps the version to 1.0.0, and runs the full quality gate.

**Files:**
- Modify: `api/src/server.ts`
- Modify: `api/config/type/schema.json`, `api/config/default.mjs`, `api/config/custom-environment-variables.mjs`
- Modify: `api/package.json`
- Modify: `package.json`

- [ ] **Step 1: Remove the npm-proxy block from `api/src/server.ts`**

In `api/src/server.ts`, in `start()`, remove these two lines:

```ts
  const npmHttpsProxy = config.npm?.httpsProxy || process.env.HTTPS_PROXY || process.env.https_proxy
  if (npmHttpsProxy) await exec('npm --workspaces=false --include-workspace-root config set https-proxy ' + npmHttpsProxy)
```

If `exec` and `promisify` (and the `child_process` / `util` imports that feed them) become unused afterwards, remove those imports and the `const exec = promisify(execCallback)` line. The lint step in Step 6 will confirm.

- [ ] **Step 2: Remove the `npm` block from the API config**

In `api/config/type/schema.json`, remove the entire `npm` property from `properties`:

```json
    "npm": {
      "type": "object",
      "properties": {
        "httpsProxy": {
          "type": "string"
        }
      }
    },
```

In `api/config/default.mjs`, remove:

```js
  npm: {
    httpsProxy: null
  },
```

In `api/config/custom-environment-variables.mjs`, remove:

```js
  npm: {
    httpsProxy: 'NPM_HTTPS_PROXY'
  },
```

Run: `npm run build-types`
Expected: completes; `ApiConfig` no longer has `npm`.

- [ ] **Step 3: Prune orphaned API dependencies**

In `api/package.json`, remove these now-unused entries:

- from `dependencies`: `"multer"`, `"semver"`, `"tmp-promise"`, `"memoizee"`
- from `devDependencies`: `"@types/multer"`, `"@types/semver"`, `"@types/memoizee"`

Run: `npm install`
Expected: completes; `package-lock.json` updated.

- [ ] **Step 4: Bump the version to 1.0.0**

In `package.json` (repo root), change `"version": "0.11.0"` to `"version": "1.0.0"`.

- [ ] **Step 5: Verify nothing else references the removed packages**

Run: `grep -rn "from 'multer'\|from 'semver'\|from 'tmp-promise'\|from 'memoizee'\|require('multer')\|require('semver')" api worker --include='*.ts'`
Expected: no matches. If any remain, the corresponding code was missed earlier — investigate and fix before continuing.

- [ ] **Step 6: Type-check and lint**

Run: `npm run check-types`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 7: Run the full quality gate**

Run: `npm run lint && npm run build-types && npm run check-types && npm -w ui run build`
Expected: all PASS.

Run: `npm run test-unit && npm run test-api`
Expected: all PASS.

Run: `npm run test-e2e`
Expected: all PASS.

If any test fails, fix the cause before committing. Do not mark this task complete with failing tests.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: 1.0.0 — prune dependencies orphaned by the registry switch"
```

---

## Self-Review (completed during plan authoring)

**Spec coverage** — every spec section maps to a task: §1 config → Tasks 2, 3 (and `dataDir` optional in 7, 8); §2 shared loader → Task 5; §3 plugin resolution → Task 7; §4 API routes → Task 7; §5 worker → Task 8; §6 UI → Tasks 10, 11; §7 upgrade script → Task 9; §8 deps/dev-env/tests → Tasks 1, 4, 6, 12, plus the test specs in 5, 7, 11; health check → Task 7 Step 9.

**Placeholder scan** — no `TBD`/`TODO`; the one spec open item (registry image) is resolved to `ghcr.io/data-fair/registry:main` in Task 1.

**Type consistency** — `getPlugin` returns `{ plugin, pkg }` consistently across Task 7 (definition + all callers) and Task 8 destructures `mod.default` the same way; `importPluginModule` signature matches its three call sites; `registryCacheDir` is exported by both `api/src/config.ts` and `worker/src/config.ts` and imported with that name everywhere.
