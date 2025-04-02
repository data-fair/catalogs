import type { SessionStateAuthenticated } from '@data-fair/lib-express/index.js'
import type { Catalog } from '#types'

import Ajv from 'ajv'
import ajvFormats from 'ajv-formats'
import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'
import { nanoid } from 'nanoid'

import eventsQueue from '@data-fair/lib-node/events-queue.js'
import { session } from '@data-fair/lib-express/index.js'
import { httpError } from '@data-fair/lib-utils/http-errors.js'
import mongo from '#mongo'
import config from '#config'
import findUtils from '../utils/find.ts'
import permissions from '../utils/permissions.ts'

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
  const params = (await import('../../docs/catalogs/get-req/index.ts')).returnValid(req.query)
  const sort = findUtils.sort(params.sort)
  const { skip, size } = findUtils.pagination(params)
  const project = findUtils.project(params.select)
  const query = findUtils.query(params, sessionState) // Check permissions

  const queryWithFilters = { ...query }

  const [results, count] = await Promise.all([
    size > 0 ? mongo.catalogs.find(queryWithFilters).limit(size).skip(skip).sort(sort).project(project).toArray() : Promise.resolve([]),
    mongo.catalogs.countDocuments(query)
  ])

  res.json({ results, count })
})

router.post('', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = { ...req.body }
  catalog._id = nanoid()
  catalog.owner = catalog.owner ?? sessionState.account
  if (!permissions.isAdmin(sessionState, catalog.owner)) return res.status(403).send('No permission to create a catalog')
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
