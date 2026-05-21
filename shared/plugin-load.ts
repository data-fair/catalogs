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
