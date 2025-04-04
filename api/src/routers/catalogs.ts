import type { SessionStateAuthenticated } from '@data-fair/lib-express'
import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog.js'
import type { Catalog } from '#types'

import { Router } from 'express'
import { nanoid } from 'nanoid'

import eventsQueue from '@data-fair/lib-node/events-queue.js'
import { assertAccountRole, session } from '@data-fair/lib-express'
import { httpError } from '@data-fair/lib-utils/http-errors.js'
import { resolvedSchema as catalogSchema } from '#types/catalog/index.ts'
import mongo from '#mongo'
import config from '#config'
// import harvester from '../utils/harvester.ts'
import findUtils from '../utils/find.ts'
import { catalogFacets } from '../utils/facets.ts'

const router = Router()
export default router

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
const validateCatalog = async (catalog: Catalog) => {
  (await import('#types/catalog/index.ts')).returnValid(catalog)
  const plugin: CatalogPlugin = await findUtils.getPlugin(catalog.plugin)
  plugin.assertConfigValid(catalog.config)
}

// Get the list of catalogs
router.get('', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, ['contrib', 'admin'])

  const params = (await import('../../doc/catalogs/get-req/index.ts')).returnValid(req.query)
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
  if (showAll && params.owners) {
    queryWithFilters.$or = params.owners.split(',').map(owner => {
      const [type, id] = owner.split(':')
      if (!type || !id) throw httpError(400, 'Invalid owner format')
      return {
        'owner.type': type,
        'owner.id': id
      }
    })
  }

  const [results, count, facets] = await Promise.all([
    size > 0 ? mongo.catalogs.find(queryWithFilters).limit(size).skip(skip).sort(sort).project(project).toArray() : Promise.resolve([]),
    mongo.catalogs.countDocuments(query),
    mongo.catalogs.aggregate(catalogFacets(query, showAll)).toArray()
  ])

  res.json({ results, count, facets: facets[0] })
})

// Create a new catalog
router.post('', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = { ...req.body }
  catalog.owner = catalog.owner ?? sessionState.account
  assertAccountRole(sessionState, catalog.owner, 'admin')

  catalog._id = nanoid()
  catalog.description = ''
  catalog.created = catalog.updated = {
    id: sessionState.user.id,
    name: sessionState.user.name,
    date: new Date().toISOString()
  }

  await validateCatalog(catalog)
  await mongo.catalogs.insertOne(catalog)

  if (config.privateEventsUrl && config.secretKeys.events) {
    sendCatalogEvent(catalog, 'a été créé', 'create', sessionState)
  }
  res.status(201).json(catalog)
})

// Get a catalog
router.get('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, ['contrib', 'admin'])
  res.status(200).json(catalog)
})

// Patch some fields of a catalog
router.patch('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  // Restrict the parts of the catalog that can be edited by API
  const acceptedParts = Object.keys(catalogSchema.properties)
    .filter(k => sessionState.user.adminMode || !(catalogSchema.properties)[k].readOnly || 'owner')
  for (const key in req.body) {
    if (!acceptedParts.includes(key)) throw httpError(400, `Unsupported patch part ${key}`)
    // check if the user has the right to change to this owner
    if (key === 'owner') assertAccountRole(sessionState, req.body.owner, 'admin', { allAccounts: true })
  }
  req.body.updated = {
    id: sessionState.user.id,
    name: sessionState.user.name,
    date: new Date().toISOString()
  }

  const patch: { $unset?: { [key: string]: true }, $set?: { [key: string]: any } } = {}
  for (const key in req.body) {
    if (req.body[key] === null) {
      patch.$unset = patch.$unset || {}
      patch.$unset[key] = true
      delete req.body[key]
    } else {
      patch.$set = patch.$set || {}
      patch.$set[key] = req.body[key]
    }
  }
  const patchedCatalog = { ...catalog, ...req.body }
  await validateCatalog(patchedCatalog)
  await mongo.catalogs.updateOne({ _id: req.params.id }, patch)
  if (config.privateEventsUrl && config.secretKeys.events) {
    sendCatalogEvent(patchedCatalog, 'a été modifié', 'patch', sessionState)
  }
  res.status(200).json(patchedCatalog)
})

// Delete a catalog
router.delete('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  await mongo.catalogs.deleteOne({ _id: req.params.id })
  if (config.privateEventsUrl && config.secretKeys.events) {
    sendCatalogEvent(catalog, 'a été supprimé', 'delete', sessionState)
  }
  res.sendStatus(204)
})

// Get the list of datasets from a catalog
router.get('/:id/datasets', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, ['contrib', 'admin'])

  // Execute the plugin function
  const plugin = await findUtils.getPlugin(catalog.plugin)
  const datasets = await plugin.listDatasets(catalog.config)

  res.json(datasets)
})

// Create a new dataset from a catalog
// router.post('/:id/datasets', async (req, res) => {
//   const sessionState = await session.reqAuthenticated(req)
//   const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
//   if (!catalog) throw httpError(404, 'Catalog not found')
//   assertAccountRole(sessionState, catalog.owner, 'admin')
//   await harvester.harvestDataset()
//   res.status(201)
// })
