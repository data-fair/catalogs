# v1.0.0 upgrade script — carry plugin title/description to the registry

**Status:** approved design — ready for implementation planning
**Date:** 2026-05-21
**Branch:** `feat-registry`

## Summary

The v1.0.0 boot migration (`upgrade/1.0.0/01-publish-plugins-to-registry.ts`)
uploads legacy on-disk catalog plugins into the `@data-fair/registry` service.
For each plugin it uploads the npm tarball, PATCHes `{ public: true }`, and then
best-effort imports the plugin module to upload its in-tarball thumbnail.

The plugin module's own `metadata.title` and `metadata.description` are
currently **discarded**. As a result migrated artefacts have no title or
description in the registry, and the catalogs picker falls back to the bare
package name with no description.

This change extracts the plugin's title and description during migration and
includes them in the metadata PATCH so the registry — now the single source of
truth — carries the same display text the plugins used to expose themselves.

## Background

### Plugin metadata shape

Catalog plugin modules export a `metadata` object
(`@data-fair/types-catalogs` → `metadata/schema.ts`):

- `title` — **a single plain string**, required (e.g. `"Catalog Mock"`,
  `"UData"`). There is no localized title in the schema.
- `description` — an optional plain string, the default description. The schema
  notes localized descriptions are preferred.
- `i18n` — an optional object keyed by language code; each entry may carry a
  localized `description` (and publication-wizard labels, which are out of
  scope here). There is **no** `i18n[lang].title`.
- `thumbnailPath` — optional; already consumed by the script.

Plugin default text is authored in French.

### Registry artefact shape

The registry stores artefact `title` and `description` as localized objects
(`{ fr, en }`). The catalogs UI reads the `fr`/`en` keys with a `fr` fallback
(`ui/src/pages/catalogs/new.vue`, `RegistryArtefact`). `PATCH
/api/v1/artefacts/{id}` accepts `public`, `title` and `description`; verified
against the running dev registry — a `description: { fr, en }` PATCH returns
200 and persists.

## Goals

1. During migration, extract each legacy plugin's title and description.
2. Write them onto the registry artefact in the registry's `{ fr, en }` shape.
3. Keep the step best-effort: a plugin whose module fails to import is still
   published with `{ public: true }`.

## Non-goals

- Localizing the title — catalog plugins have no localized title; the single
  title string is reused for both locales.
- Migrating publication-wizard i18n labels (`actionLabels`, `actionButtons`,
  `stepTitles`) — those are consumed at publish time from the plugin module,
  not from the registry artefact.
- Locales beyond `fr` and `en` — the catalogs UI consumes only those two.
- Backfilling artefacts already published by an earlier run of the script (the
  script is idempotent and skips an already-published arch slot).

## Design

### 1 — Extraction helpers

Two pure functions in a **new config-free sibling module**
`upgrade/1.0.0/plugin-metadata.ts`. They cannot live in the upgrade script
itself: that script imports `worker/src/config.ts`, which runs `assertValid()`
at module load and throws outside a fully-configured worker environment — so a
unit test importing the script would fail to load. A standalone module has no
config dependency and is trivially testable.

```ts
type PluginMetadata = {
  title?: string
  description?: string
  thumbnailPath?: string
  i18n?: Record<string, { description?: string } | undefined>
}

/**
 * Catalog plugins expose a single, language-neutral title string. Replicate it
 * to both registry locales. Returns undefined when the plugin declares no title.
 */
export const pluginTitle = (m: PluginMetadata): { fr: string, en: string } | undefined =>
  m.title ? { fr: m.title, en: m.title } : undefined

/**
 * Build the registry's localized description from the plugin metadata.
 * - fr: the French localized description, falling back to the default
 *   description (plugin defaults are authored in French).
 * - en: the English localized description only — the French default is never
 *   copied into the en slot.
 * Returns undefined when neither locale yields text; omits an empty en key.
 */
export const pluginDescription = (m: PluginMetadata): { fr?: string, en?: string } | undefined => {
  const fr = m.i18n?.fr?.description ?? m.description
  const en = m.i18n?.en?.description
  if (!fr && !en) return undefined
  const out: { fr?: string, en?: string } = {}
  if (fr) out.fr = fr
  if (en) out.en = en
  return out
}
```

### 2 — Script restructure

Currently the script imports the plugin module *after* the `{ public: true }`
PATCH, solely for the thumbnail. Move the import *before* the PATCH so the
extracted metadata feeds both the PATCH and the thumbnail step.

Per plugin, after the tarball upload:

1. Best-effort import the plugin module and read `mod.default?.metadata`. Wrap
   in its own `try/catch`; on failure, log via `debug(...)` and leave
   `metadata` undefined.
2. Build the PATCH body: start from `{ public: true }`; when `metadata` is
   present, add `title` from `pluginTitle(metadata)` and `description` from
   `pluginDescription(metadata)` (each only when defined).
3. Send the single `PATCH /api/v1/artefacts/{id}` with that body.
4. Run the existing thumbnail upload using `metadata?.thumbnailPath` (no longer
   re-imports the module).

A plugin whose module import fails still gets `PATCH { public: true }` — same
publication outcome as today, just without title/description/thumbnail.

The per-plugin `try/catch` that records `failures[]` and the final failure
summary are unchanged.

### 3 — Testing

New unit spec `tests/features/upgrade/plugin-metadata.unit.spec.ts`
(Playwright `test`/`expect`, matching `tests/features/shared/plugin-load.unit.spec.ts`),
importing `pluginTitle` and `pluginDescription` from
`upgrade/1.0.0/plugin-metadata.ts`.

Cases:

- `pluginTitle`: a title string replicates to `{ fr, en }`; missing title →
  `undefined`.
- `pluginDescription`:
  - `i18n.fr.description` present → used for `fr`.
  - no `i18n.fr.description`, default `description` present → default used for
    `fr`.
  - `i18n.en.description` present → used for `en`.
  - no `i18n.en.description` → `en` key omitted (the French default does not
    leak into `en`).
  - no description anywhere → `undefined`.

The script's end-to-end migration behaviour is not automatically tested — it
requires a legacy on-disk plugins volume that the dev environment does not have
(consistent with the existing manual verification procedure for Task 9 of the
registry-integration plan).

## Files touched

- `upgrade/1.0.0/plugin-metadata.ts` — new config-free module with the
  `PluginMetadata` type and the `pluginTitle` / `pluginDescription` helpers.
- `upgrade/1.0.0/01-publish-plugins-to-registry.ts` — import the helpers; move
  the module import ahead of the PATCH; fold title/description into the PATCH
  body.
- `tests/features/upgrade/plugin-metadata.unit.spec.ts` — new unit spec.
