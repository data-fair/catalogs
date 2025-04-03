import type { SessionStateAuthenticated } from '@data-fair/lib-express'
import type { Catalog } from '#types'

import Ajv from 'ajv'
import ajvFormats from 'ajv-formats'
import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'
import { nanoid } from 'nanoid'

import eventsQueue from '@data-fair/lib-node/events-queue.js'
import { assertAccountRole, session } from '@data-fair/lib-express'
import { httpError } from '@data-fair/lib-utils/http-errors.js'
import mongo from '#mongo'
import config from '#config'
import findUtils from '../utils/find.ts'
import { catalogAggregation } from '../utils/facets.ts'

const router = Router()
export default router

// @ts-ignore
const ajv = ajvFormats(new Ajv({ strict: false }))
const pluginsDir = path.join(config.dataDir, 'plugins')

/**
 * Helper function to send events related to catalogs
 * @param catalog The catalog object
 * @param actionText The text describing the action (e.g. "a été créé")
 * @param topicAction The action part of the topic key (e.g. "create", "delete")
 * @param sessionState Optional session state for authentication
 */
const sendCatalogEvent = (
  catalog: Catalog,
  actionText: string,
  topicAction: string,
  sessionState?: SessionStateAuthenticated
) => {
  if (!config.privateEventsUrl && !config.secretKeys.events) return

  eventsQueue.pushEvent({
    title: `Le traitement ${catalog.title} ${actionText}`,
    topic: { key: `catalogs:catalog-${topicAction}:${catalog._id}` },
    sender: catalog.owner,
    resource: {
      type: 'catalog',
      id: catalog._id,
      title: catalog.title,
    }
  }, sessionState)
}

/**
 * Check that a catalog object is valid
 * Check if the plugin exists
 * Check if the config is valid
 */
const validateCatalog = async (catalog: Catalog, withConfig: boolean = true) => {
  (await import('#types/catalog/index.ts')).returnValid(catalog)
  if (!await fs.pathExists(path.join(pluginsDir, catalog.plugin))) throw httpError(400, 'Plugin not found')
  if (withConfig) {
    const configSchema = await fs.readJson(path.join(pluginsDir, path.join(catalog.plugin, 'config-schema.json')))
    const configValidate = ajv.compile(configSchema)
    const configValid = configValidate(catalog.config)
    if (!configValid) throw httpError(400, JSON.stringify(configValidate.errors))
  }
}

// Get the list of catalogs
router.get('', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, ['contrib', 'admin'])

  const params = (await import('../../docs/catalogs/get-req/index.ts')).returnValid(req.query)
  const sort = findUtils.sort(params.sort)
  const { skip, size } = findUtils.pagination(params)
  const project = findUtils.project(params.select)
  const query = findUtils.query(params, sessionState) // Check permissions

  const queryWithFilters = { ...query }
  // Filter by plugins
  const plugins = params.plugins ? params.plugins.split(',') : []
  if (plugins.length > 0) {
    queryWithFilters.plugin = { $in: plugins }
  }

  // Filter by owner (if showAll)
  const showAll = params.showAll === 'true'
  if (showAll) {
    const owners = params.owners ? params.owners.split(',') : []
    if (owners.length > 0) {
      queryWithFilters.owner = { $in: owners }
    }
  }

  const [results, count, facets] = await Promise.all([
    size > 0 ? mongo.catalogs.find(queryWithFilters).limit(size).skip(skip).sort(sort).project(project).toArray() : Promise.resolve([]),
    mongo.catalogs.countDocuments(query),
    mongo.catalogs.aggregate(catalogAggregation(query, showAll)).toArray()
  ])

  res.json({ results, count, facets: facets[0] })
})

router.post('', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = { ...req.body }
  catalog.owner = catalog.owner ?? sessionState.account
  assertAccountRole(sessionState, catalog.owner, ['contrib', 'admin'])

  catalog._id = nanoid()
  catalog.description = ''
  catalog.created = catalog.updated = {
    id: sessionState.user.id,
    name: sessionState.user.name,
    date: new Date().toISOString()
  }

  await validateCatalog(catalog, false)
  await mongo.catalogs.insertOne(catalog)

  sendCatalogEvent(catalog, 'a été créé', 'create', sessionState)
  res.status(200).json(catalog)
})
