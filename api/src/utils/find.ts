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

// Get the plugin from the plugins directory
// TODO : Optimize this to not load the plugin each time
fs.ensureDirSync(config.dataDir)
const pluginsDir = path.resolve(config.dataDir, 'plugins')
export const getPlugin = async (pluginId: string) => {
  let plugin: CatalogPlugin
  try {
    plugin = await import(path.resolve(pluginsDir, pluginId, 'index.ts'))
  } catch (e) {
    throw httpError(404, `Plugin ${pluginId} not found`)
  }
  return plugin
}

export default {
  query,
  getPlugin,
  sort: mongoSort,
  pagination: mongoPagination,
  project: mongoProjection
}
