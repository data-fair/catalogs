import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog/index.js'

import { mongoPagination, mongoProjection, mongoSort, type SessionStateAuthenticated } from '@data-fair/lib-express'
import { httpError } from '@data-fair/lib-utils/http-errors.js'
import config from '#config'
import fs from 'fs-extra'
import path from 'path'

/**
 * Show all if super admin, otherwise filter by owner
 */
export const filterPermissions = (reqQuery: Record<string, string>, sessionState: SessionStateAuthenticated) => {
  const query: Record<string, any> = {}

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

/**
 * Generate a MongoDB query from the request query parameters
 * Use q reqQuery parameter to a text search
 * @param reqQuery The request query parameters
 * @param fieldsMap The mapping of request query parameters to MongoDB fields
 */
export const query = (reqQuery: Record<string, string>, fieldsMap: Record<string, string> = {}) => {
  const query: Record<string, any> = {}

  if (reqQuery.q) query.$text = { $search: reqQuery.q }

  Object.keys(fieldsMap).filter(name => reqQuery[name] !== undefined).forEach(name => {
    query[fieldsMap[name]] = { $in: reqQuery[name].split(',') }
  })
  return query
}

// Get the plugin from the plugins directory
const pluginsDir = path.resolve(config.dataDir, 'plugins')
fs.ensureDirSync(pluginsDir)
export const getPlugin = async (pluginId: string): Promise<CatalogPlugin> => {
  try {
    if (!pluginId) throw httpError(400, 'Plugin ID is required')

    const pluginJsonPath = path.join(pluginsDir, pluginId, 'plugin.json')
    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'))
    const pluginPath = path.join(pluginsDir, pluginId, pluginJson.version, 'index.ts')
    if (!pluginPath) throw httpError(404, `No version found in plugin ${pluginId}`)
    return (await import(pluginPath)).default
  } catch (e: any) {
    if (e.message.includes('Cannot find module')) throw httpError(404, `Plugin ${pluginId} not found (or error in plugin : ${e.message})`)
    throw e // Rethrow other errors
  }
}

export default {
  query,
  filterPermissions,
  getPlugin,
  sort: mongoSort,
  pagination: mongoPagination,
  project: mongoProjection
}
