# Data Fair Catalogs — Agent Guidelines

## Project Overview

`@data-fair/catalogs` is a sister service of `data-fair`. It imports datasets from external
catalogs into a running `data-fair` instance and publishes `data-fair` datasets to those
catalogs, through NPM-installable plugins. The project is a monorepo with four workspaces:

- `api/` — Express REST API
- `worker/` — polling worker that runs imports and publications
- `ui/` — Vue 3 + Vuetify SPA (built with Vite)
- `shared/` — TypeScript helpers shared between api, worker and ui

## Dev environment

Docker runs the containers (nginx, simple-directory, data-fair, registry, elasticsearch, mongo; optional profiles
`events` and `agents`); the api, the worker and the ui run as node processes.

- `npm run dev` — the containers (`npm run dev-deps`), then the api, the worker and the ui in the terminal (Ctrl+C
  stops them), at `http://localhost:5800/catalogs/dev`. Their logs are in `dev/logs/` (`DEV_LOG_DIR`,
  `DEV_LOG_PREFIX`); `npm run dev` accepts docker compose arguments (`npm run dev -- --profile agents`).
- `npm run dev-deps` — the containers only, plus `npm run dev-setup`.
- `npm run dev-setup` — idempotent builds (types, ui), no container.
- `npm run dev:api`, `dev:worker`, `dev:ui` — one process each, with the variables of `.env` exported.
- `npm run stop-dev-deps` — stops the containers.

Default ports (5800-5812) are in `dev/default.env`, copied to `.env` the first time: `.env` overrides it and is
never overwritten. Production names (`MONGO_URL`, `PRIVATE_DIRECTORY_URL`, `PRIVATE_REGISTRY_URL`,
`PRIVATE_DATA_FAIR_URL`, `DATA_FAIR_API_KEY`...) override `api/config/development.mjs` and
`worker/config/development.mjs`. Without the `events` profile, the api and the worker log a failure per pushed
event; an empty `EVENTS_PORT` (when another environment provides the containers) turns the integration off.

- Read the logs before restarting: nodemon (api, worker) and vite (ui) already reload on file changes.
- Do not start, stop or restart the dev processes or containers of the user: ask.
- Never `npm ci` / `npm install` while the env runs.
- If a service is down, do not try to fix the infrastructure: read its logs (`dev/logs/`, or
  `docker compose logs <service>` for a container) and report the problem to the user with the relevant lines.

The dev environment also serves as the test environment: the Playwright test suite hits the
running dev API, dev worker and dev UI. There is no separate test server.

Design specs and implementation plans are not kept in this repository; durable architecture docs live in `docs/architecture/`.

### Test sub-space

The tests own the simple-directory accounts whose ids start with `test_catalogs_`
(@tests/support/sd-fixtures.ts: `test_catalogs_superadmin`, a simple-directory admin, `test_catalogs_org1` with
its admin, contributor, user, department members and scope NHI, `test_catalogs_org2` with its admin; password
`passwd`, email `<id>@test.com`). `tests/global-setup.ts` upserts them through simple-directory's test API
before the spec files load, and `tests/state-setup.ts`, under a lock against a second concurrent run, cleans
and seeds them again, cleans the sub-space here and sets up the worker's data-fair key (below). The dev world
`test_demo_` (`npm run dev-world`, run by `dev-deps`, @dev/resources/demo-world.json, login
`test_demo_dev@example.org` / `passwd`, a simple-directory admin) is never cleaned by the tests.

Everything a test creates belongs to the sub-space: owners under `test_catalogs_`, and the mock plugin's
registry artefact `@test_catalogs_catalog-mock-0` (`tests/support/registry.ts`, uploaded with the registry's
internal secret on its private URL), which registry's own prefixed clean removes.

**The worker's data-fair key.** The worker writes the imported datasets in data-fair in the name of their
owner (`x-account`), with an API key in admin mode. `tests/support/data-fair.ts` creates it through data-fair's
API, as `test_catalogs_superadmin` in admin mode on its own settings, and hands it to the worker through
`PUT /api/test-env/data-fair-api-key`: in development, without `DATA_FAIR_API_KEY`, the worker reads it from
its database before each task (`worker/src/lib/data-fair-api-key.ts`). The tests never write into another
service's database. For manual work, run the tests once, or set `DATA_FAIR_API_KEY` in `.env` (an admin mode
key with `asAccount`, created in data-fair by a super admin, see CONTRIBUTING.md).

### Test-env API

When `NODE_ENV=development` the API exposes `/api/test-env`:
- `GET /` — readiness probe (`{ ok: true }`)
- `DELETE /?prefix=test_<suite>_` — delete the catalogs, imports and publications owned by the accounts of
  that prefix, and the locks of those tasks; 400 without a valid prefix, 204 after the clean. It answers 409
  with the list of the sub-space's tasks the worker still runs after 5 s (a task leaking from a test). Several
  suites can share one catalogs service: the clean of one prefix never touches another one
  (`tests/features/test-env/test-env.api.spec.ts`)
- `PUT /data-fair-api-key` — the worker's data-fair key (above)
- `GET /catalogs/:id`, `POST /docs/:collection`, `GET /docs/:collection/:id` — raw documents, for the tests
- `DELETE /plugins` — wipe the installed plugins directory

These endpoints are used by the Playwright support helpers in `tests/support/`.

### Testing

```bash
npm test                          # all tests
npm run test-unit                 # unit tests only
npm run test-api                  # API tests only
npm run test-api-fast             # API tests, stop at the first failure (iteration only)
npm run test-e2e                  # browser e2e tests only
npx playwright test path/to/file  # a specific file
```

Tests are organized under `tests/features/<topic>/<name>.{unit,api,e2e}.spec.ts`; api and e2e
specs import `test` / `expect` from `tests/fixtures/login.ts`. The `state-setup` project
checks that the dev API is up, `e2e-warmup` visits every UI route once so a cold vite transforms them before the e2e tests;
dependency discovery is off, so a blank page there with a module named in the console means a
commonjs dependency is missing from `optimizeDeps.include` in `ui/vite.config.ts` (use the
exact import specifier). On a failure the api and
worker logs (`dev/logs/`) are attached to the trace (`npx playwright show-trace test-results/<test>/trace.zip`);
per-test durations of the last run are in `dev/logs/test-timings.json`. Keep the 30 s test
timeout (hooks included): a heavy spec calls `test.slow()`.

Quality gates:

| When | What |
|---|---|
| commit (`.husky/pre-commit`) | `npm run lint` |
| push (`.husky/pre-push` → `dev/pre-push.sh`) | type check, unit tests, the `@smoke` api/e2e tests, and the api/e2e spec files changed since `origin/master` |
| pull request, release tag (`reuse-quality.yml`) | lint, types, UI build, audit, and the whole unit/api/e2e suite (no nightly: the suite is small) |

`@smoke` (`test('...', { tag: '@smoke' }, ...)`) marks a few fast tests over the core flows
(catalog CRUD, import, publication, plugin resolution, list page, configuration edition,
plugin picker). Tag a test only if it is fast and covers a path many features depend on.
When iterating, run only the related test cases; `npm run quality` runs the full gate locally.

### AI assistant

The UI exposes WebMCP tools and host state to the data-fair chat, see
`docs/architecture/agent-integration.md`. Update it when you add, rename or remove a tool.

### Simulations

The judged browser simulations of the assistant (a simulated person, a real model, a judge reading the
transcript) are not kept in this repository. What a judge reads as the product's promises is
`docs/architecture/agent-integration.md`, keep it current when the agent tools change. They publish the mock plugin
`tests/fixtures/catalog-mock.tgz`: keep it a working catalog plugin.

### Linting & Type Checking

```bash
npm run lint             # ESLint (root + ui workspace)
npm run lint-fix         # auto-fix
npm run check-types      # TypeScript
```

### Building

```bash
npm run build-types      # generate type definitions from JSON schemas
npm -w ui run build      # build the Vue SPA
```

## Scopes and API document

catalogs is scope-aware (`session.init(..., { scopeAware: true })`): a session whose token carries a `scope` claim can only be read on routes that checked a scope, otherwise it gets 403. Scoped sessions come from the non-human identity token exchange of simple-directory, later also from OAuth client applications. Sessions without a `scope` claim and internal secret calls are not affected.

- The vocabulary (the `catalogs` family with read / write / admin tiers, declared with `defineScopes` from `@data-fair/lib-common-types/scopes.js`, which adds the global `all:read` / `all:write` / `all:admin`) and the operation table live in `api/src/scopes.ts`. The worker reaches data-fair with its own key in the name of the owner: `catalogs:write` alone creates datasets (imports) and sends datasets outside (publications), the descriptions say so; keep them explicit.
- Every new session-facing route gets a row in `scopedOperations` and `requireOperationScope('<operationId>')` as its first handler. Without one it stays refused to scoped sessions (the admin routes, on purpose). Parts of a body that need a higher tier than the route are checked in the route with `assertReqScope` (the admin parts of an import PATCH, `api/src/imports/patch-fields.ts`).
- `GET /api/api-docs.json` (`api/contract/api-docs.ts`, built from the same table) is the document data-fair merges into the platform document: keep it independent of the request origin (data-fair fetches it over the private url) and keep each accepted scope as its own `security` alternative. Edit the table, not the document. Its skills are the markdown files of `api/contract/skills/`, served at `/api/agents/skills/<name>.md`.
- Tests: `tests/features/scopes/` (vocabulary, route enforcement with `nhiSession` from `tests/support/nhi.ts`, the test NHI of `tests/support/sd-fixtures.ts`) and `tests/features/agent-tools/`.

## Logging

Server code (`api/`, `worker/`, `shared/`) logs through `import log from '@data-fair/lib-node/log.js'`
(pino: JSON on stdout in production, pretty in dev); the full API is in the "Logging" section of the
`@data-fair/lib-node` README. eslint `no-console` applies to `api/src/**`, `worker/src/**`, `shared/**` and the
two `index.ts`; `api/scripts/` keep `console`.

- `log.info|warn|alert|error(msg, { code?, err?, ...fields })`: `code` is a **static string**, ids go in their
  own fields, the error in `err`, never in the message.
- `error` is for internal failures only (counted in `df_logs`, alerting). Client errors, upstream failures
  (a remote catalog, a plugin removed from the registry) and situations reported to the owner on the
  task (lost permissions, missing publication site) are `warn`.
- The actor (ip, host, userId, accountKey...) is never passed by hand: `session.middleware()` opens the
  request log context. The owner of a catalog, import or publication uses the `owner*` names
  (`ownerLogFields` in `shared/log-fields.ts`).
- The worker runs each task in `withLogContext(taskLogFields(task, type))` (`catalogId`, `taskType`,
  `importId` / `publicationId`, owner), so every line below it, plugin code included, carries the task.
  The plugin is loaded before entering that context, its lines pass the fields explicitly.
- `debug` call sites are unchanged; their output is redirected into the logger.
- Task logs shown in the UI (`worker/src/lib/logs.ts`, the `log` given to plugins) are a separate thing,
  stored on the import / publication document.
