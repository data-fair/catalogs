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
  account: PluginAccount
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
      account: { type: account.type, id: account.id, ...(account.department ? { department: account.department } : {}) }
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
