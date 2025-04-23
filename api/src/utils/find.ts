import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog.js'

import { mongoPagination, mongoProjection, mongoSort, type SessionStateAuthenticated } from '@data-fair/lib-express'
import { httpError } from '@data-fair/lib-utils/http-errors.js'
import config from '#config'
import fs from 'fs-extra'
import path from 'path'

// Util functions shared accross the main find (GET on collection) endpoints
export const query = (reqQuery: Record<string, string>, sessionState: SessionStateAuthenticated) => {
  const query: Record<string, any> = {}

  if (reqQuery.q) query.$text = { $search: reqQuery.q }

  const showAll = reqQuery.showAll === 'true'
  if (showAll && !sessionState.user.adminMode) {
    throw httpError(400, 'Only super admins can override permissions filter with showAll parameter')
  }
  if (!showAll) {
    query['owner.type'] = sessionState.account.type
    query['owner.id'] = sessionState.account.id
    if (sessionState.account.department) query['owner.department'] = sessionState.account.department
  }
  return query
}

// Cache loaded plugins to avoid loading them each time
const pluginsCache: Record<string, CatalogPlugin> = {}

// Get the plugin from the plugins directory or from cache if already loaded
const pluginsDir = path.resolve(config.dataDir, 'plugins')
fs.ensureDirSync(pluginsDir)
export const getPlugin = async (pluginId: string): Promise<CatalogPlugin> => {
  if (pluginsCache[pluginId]) return pluginsCache[pluginId] // Return cached plugin if available

  try {
    const plugin = (await import(path.resolve(pluginsDir, pluginId, 'index.ts'))).default
    pluginsCache[pluginId] = plugin // Store in cache for future use
    return plugin
  } catch (e: any) {
    if (e.message.includes('Cannot find module')) throw httpError(404, `Plugin ${pluginId} not found`)
    throw e // Rethrow other errors
  }
}

export const removePluginFromCache = (pluginId: string) => delete pluginsCache[pluginId]

export default {
  query,
  getPlugin,
  sort: mongoSort,
  pagination: mongoPagination,
  project: mongoProjection
}
