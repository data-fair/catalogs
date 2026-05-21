# Migrate plugin title/description to the registry — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the v1.0.0 boot migration carry each legacy catalog plugin's title and description onto its registry artefact.

**Architecture:** Two pure extraction helpers live in a new config-free module `upgrade/1.0.0/plugin-metadata.ts` (unit-tested in isolation). The migration script `upgrade/1.0.0/01-publish-plugins-to-registry.ts` imports the plugin module once, before the metadata PATCH, and folds the extracted `title`/`description` into the single `PATCH /api/v1/artefacts/{id}` call alongside `{ public: true }`. The same `metadata` object then feeds the existing thumbnail upload.

**Tech Stack:** TypeScript (Node type-stripping, `.ts` extension imports), Playwright test runner (`unit` project, no dev-environment dependency).

---

## Background for the engineer

- Catalog plugin modules export a `metadata` object. `metadata.title` is a single
  **plain string** (there is no localized title in the schema). `metadata.description`
  is an optional plain string — the default. `metadata.i18n` is an optional object
  keyed by language code; each entry may carry a localized `description`. Plugin
  default text is authored in French.
- The registry stores artefact `title` and `description` as localized objects
  (`{ fr, en }`). `PATCH /api/v1/artefacts/{id}` accepts `public`, `title` and
  `description` (verified against the dev registry).
- The migration script currently imports each plugin module **after** the
  `{ public: true }` PATCH, only to read `metadata.thumbnailPath`. Its
  `metadata.title` / `metadata.description` are discarded.
- The script must not import `worker/src/config.ts` indirectly into a unit test:
  that config runs `assertValid()` at module load and throws outside a fully
  configured worker. Hence the helpers live in their own config-free module.
- The `unit` Playwright project (`playwright.config.ts`) has **no** `state-setup`
  dependency, so unit specs run without the dev environment.
- `tsconfig.json` excludes `tests/` from `tsc` but type-checks `upgrade/`. ESLint
  (`eslint .`) covers both.

---

## File Structure

- `upgrade/1.0.0/plugin-metadata.ts` — **new.** The `PluginMetadata` type plus the
  `pluginTitle` and `pluginDescription` pure helpers. No imports, no config.
- `tests/features/upgrade/plugin-metadata.unit.spec.ts` — **new.** Unit spec for the
  two helpers.
- `upgrade/1.0.0/01-publish-plugins-to-registry.ts` — **modified.** Imports the
  helpers; moves the plugin-module import ahead of the PATCH; builds the PATCH body
  with `title`/`description`; the thumbnail step reuses the imported `metadata`.

---

## Task 1: Metadata extraction helpers

**Files:**
- Create: `upgrade/1.0.0/plugin-metadata.ts`
- Test: `tests/features/upgrade/plugin-metadata.unit.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/features/upgrade/plugin-metadata.unit.spec.ts`:

```ts
import { test, expect } from '@playwright/test'
import { pluginTitle, pluginDescription } from '../../../upgrade/1.0.0/plugin-metadata.ts'

test.describe('pluginTitle', () => {
  test('replicates the single title string to fr and en', () => {
    expect(pluginTitle({ title: 'Catalog Mock' })).toEqual({ fr: 'Catalog Mock', en: 'Catalog Mock' })
  })

  test('returns undefined when no title is declared', () => {
    expect(pluginTitle({})).toBeUndefined()
  })
})

test.describe('pluginDescription', () => {
  test('uses the localized fr and en descriptions when both are present', () => {
    expect(pluginDescription({
      description: 'défaut',
      i18n: { fr: { description: 'desc fr' }, en: { description: 'desc en' } }
    })).toEqual({ fr: 'desc fr', en: 'desc en' })
  })

  test('falls back to the default description for fr when there is no fr localization', () => {
    expect(pluginDescription({ description: 'description par défaut' }))
      .toEqual({ fr: 'description par défaut' })
  })

  test('omits en — and never leaks the French default into it — when the plugin ships no English description', () => {
    const result = pluginDescription({ description: 'défaut', i18n: { fr: { description: 'desc fr' } } })
    expect(result).toEqual({ fr: 'desc fr' })
    expect(result).not.toHaveProperty('en')
  })

  test('uses the en localized description even without a default description', () => {
    expect(pluginDescription({ i18n: { en: { description: 'desc en' } } }))
      .toEqual({ en: 'desc en' })
  })

  test('returns undefined when no description is available anywhere', () => {
    expect(pluginDescription({})).toBeUndefined()
    expect(pluginDescription({ i18n: {} })).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/features/upgrade/plugin-metadata.unit.spec.ts --project=unit`
Expected: FAIL — the spec cannot be loaded, error resolving `../../../upgrade/1.0.0/plugin-metadata.ts` (`Cannot find module`), because the module does not exist yet.

- [ ] **Step 3: Create the helper module**

Create `upgrade/1.0.0/plugin-metadata.ts`:

```ts
/**
 * The slice of a catalog plugin's exported `metadata` object that the v1.0.0
 * migration reads. Catalog plugins have no localized title — `title` is a
 * single plain string; only `description` is localizable, via `i18n`.
 */
export type PluginMetadata = {
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/features/upgrade/plugin-metadata.unit.spec.ts --project=unit`
Expected: PASS — 7 tests passed.

- [ ] **Step 5: Lint the new files**

Run: `npm run lint`
Expected: exits 0, no errors.

- [ ] **Step 6: Commit**

```bash
git add upgrade/1.0.0/plugin-metadata.ts tests/features/upgrade/plugin-metadata.unit.spec.ts
git commit -m "$(cat <<'EOF'
feat: extract plugin title/description for the v1.0.0 registry migration

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Wire the helpers into the migration

**Files:**
- Modify: `upgrade/1.0.0/01-publish-plugins-to-registry.ts:11` (imports) and `:116-146` (upload → PATCH → thumbnail block)

- [ ] **Step 1: Add the helper import**

In `upgrade/1.0.0/01-publish-plugins-to-registry.ts`, the imports currently end with:

```ts
import { importPluginModule } from '@data-fair/catalogs-shared/plugin-load.ts'
import config from '../../worker/src/config.ts'
```

Insert the helper import between those two lines so the block reads:

```ts
import { importPluginModule } from '@data-fair/catalogs-shared/plugin-load.ts'
import { pluginTitle, pluginDescription, type PluginMetadata } from './plugin-metadata.ts'
import config from '../../worker/src/config.ts'
```

- [ ] **Step 2: Replace the upload → PATCH → thumbnail block**

Find this exact block (currently lines 116–146, inside the per-plugin `try`):

```ts
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
```

Replace it with:

```ts
          const form = new FormData()
          form.append('architecture', hostArch)
          form.append('category', 'catalog')
          form.append('file', new Blob([await readFile(tarballPath)]), 'package.tgz')
          debug(`${dir}: uploading ${pluginJson.name}@${pluginJson.version} as ${artefactId} (${hostArch})`)
          await ax.post(`/api/v1/artefacts/npm/${encodeURIComponent(artefactId)}`, form, {
            validateStatus: s => s === 201
          })

          // Best-effort: read the plugin module's metadata for its title,
          // description and thumbnail. A failure here must not block
          // publication — the artefact is still made public below.
          let metadata: PluginMetadata | undefined
          try {
            const mod = await importPluginModule<{ default: { metadata?: PluginMetadata } }>(versionDir)
            metadata = mod.default?.metadata
          } catch (err: any) {
            debug(`${dir}: plugin metadata unreadable (${err?.message ?? err})`)
          }

          // Preserve today's "every account-admin can use every plugin", and
          // carry over the plugin's own title/description so the registry
          // picker shows them.
          const patch: {
            public: true
            title?: { fr: string, en: string }
            description?: { fr?: string, en?: string }
          } = { public: true }
          if (metadata) {
            const title = pluginTitle(metadata)
            if (title) patch.title = title
            const description = pluginDescription(metadata)
            if (description) patch.description = description
          }
          await ax.patch(`/api/v1/artefacts/${encodeURIComponent(artefactId)}`, patch)
          debug(`${dir}: published`)

          // Best-effort: publish the in-tarball thumbnail to the registry so
          // the picker shows an icon for migrated plugins.
          try {
            const thumbnailPath = metadata?.thumbnailPath
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
```

What changed: the plugin-module import moved ahead of the PATCH into its own
best-effort `try/catch` (a broken module no longer prevents `{ public: true }`);
the PATCH body now also carries `title`/`description` when available; the
thumbnail block reuses `metadata` instead of re-importing the module.

- [ ] **Step 3: Type-check**

Run: `npm run check-types`
Expected: exits 0, no errors. (`tsc` type-checks `upgrade/` — both the new
module and the modified script.)

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: exits 0, no errors.

- [ ] **Step 5: Re-run the unit test as a sanity check**

Run: `npx playwright test tests/features/upgrade/plugin-metadata.unit.spec.ts --project=unit`
Expected: PASS — 7 tests passed (the helpers are unchanged; this confirms the
build is still consistent).

- [ ] **Step 6: Commit**

```bash
git add upgrade/1.0.0/01-publish-plugins-to-registry.ts
git commit -m "$(cat <<'EOF'
feat: publish legacy plugin title/description during the v1.0.0 migration

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Verification notes

- The end-to-end migration (a populated `<dataDir>/plugins` volume publishing to
  a live registry) is **not** automatically tested — it needs a legacy on-disk
  plugins volume the dev environment does not have. This matches the existing
  Task 9 manual verification procedure in
  `docs/superpowers/plans/2026-05-21-registry-integration.md`. Anyone wanting a
  full run can follow that procedure; the registry artefact's `title` and
  `description` should then be populated from the plugin metadata.
- The change is otherwise covered by: the `pluginTitle`/`pluginDescription` unit
  tests, `npm run check-types`, and `npm run lint`.
