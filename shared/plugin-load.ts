import path from 'node:path'
import { readFile, access } from 'node:fs/promises'

/**
 * Resolve a plugin's entry point from its package.json#main and dynamic-import it.
 *
 * Plugins can ship pre-built JS (main: "index.js") or rely on Node's built-in
 * type-stripping (main: "index.ts"). Callers must not hard-code an extension —
 * read main and trust it. Defaults to "index.js" when main is absent.
 *
 * No in-process cache busting is needed: @data-fair/lib-node-registry extracts a
 * changed artefact into a content-versioned directory, so an updated plugin
 * always resolves to a brand-new absolute path. That forces Node's ESM registry
 * to reload the whole module graph (entry + siblings + bundled deps) — something
 * a `?query` suffix on the entry point could never do.
 */
export const importPluginModule = async <T = unknown> (
  pluginDir: string
): Promise<T> => {
  const pkg = JSON.parse(await readFile(path.join(pluginDir, 'package.json'), 'utf8'))
  const mainRel = typeof pkg.main === 'string' && pkg.main.length > 0 ? pkg.main : 'index.js'
  const mainAbs = path.resolve(pluginDir, mainRel)
  try {
    await access(mainAbs)
  } catch {
    throw new Error(`plugin entry point missing: ${mainAbs}`)
  }
  return (await import(mainAbs)) as T
}
