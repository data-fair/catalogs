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
