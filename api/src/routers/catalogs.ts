import type { SessionStateAuthenticated } from '@data-fair/lib-express'
import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog/index.js'
import type { Catalog } from '#types'
import type { CatalogPostReq } from '#doc/catalogs/post-req/index.ts'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import eventsQueue from '@data-fair/lib-node/events-queue.js'
import { assertAccountRole, session, httpError } from '@data-fair/lib-express'
import { cipher, decipherSecrets } from '@data-fair/catalogs-shared/cipher.ts'
import { resolvedSchema as catalogSchema } from '#types/catalog/index.ts'
import mongo from '#mongo'
import config from '#config'
import findUtils from '#utils/find.ts'
import { catalogFacets } from '#utils/facets.ts'

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
    title: `Le catalogue ${catalog.title} ${actionText}`,
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
const validateCatalog = async (catalog: Partial<Catalog>) => {
  const validCatalog = (await import('#types/catalog/index.ts')).returnValid(catalog)
  const plugin: CatalogPlugin = await findUtils.getPlugin(validCatalog.plugin)
  plugin.assertConfigValid(validCatalog.config)
  return validCatalog
}

const prepareCatalog = async (catalog: Catalog) => {
  const ret: {
    config?: Catalog['config'],
    secrets?: Catalog['secrets'],
    capabilities?: Catalog['capabilities']
  } = {}

  const plugin = await findUtils.getPlugin(catalog.plugin)
  const prepareRes = await plugin.prepare({
    catalogConfig: catalog.config,
    capabilities: catalog.capabilities,
    secrets: decipherSecrets(catalog.secrets, config.cipherPassword)
  })

  if (prepareRes.catalogConfig) ret.config = prepareRes.catalogConfig as Catalog['config']
  if (prepareRes.capabilities) ret.capabilities = prepareRes.capabilities
  if (prepareRes.secrets) {
    ret.secrets = {}
    for (const key of Object.keys(prepareRes.secrets)) {
      ret.secrets[key] = cipher(prepareRes.secrets[key], config.cipherPassword)
    }
  }
  return ret
}

// Get the list of catalogs
router.get('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  const params = (await import('../../doc/catalogs/get-req/index.ts')).returnValid(req.query)
  const sort = findUtils.sort(params.sort || 'updated.date:-1')
  const { skip, size } = findUtils.pagination(params)
  const project = findUtils.project(params.select)
  const query = findUtils.filterPermissions(params, sessionState)
  const filters = findUtils.query(params, { plugins: 'plugin' })
  const queryWithFilters = Object.assign(filters, query)

  // Exclude catalogs marked for deletion
  queryWithFilters.deletionRequested = { $ne: true }

  // Filter capabilities
  if (params.capabilities) queryWithFilters.capabilities = { $all: params.capabilities?.split(',') ?? [] }

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

  // Remove secrets from each result
  results.forEach(catalog => delete catalog.secrets)
  res.json({ results, count, facets: facets[0] })
})

// Create a new catalog
router.post('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const { body } = (await import('../../doc/catalogs/post-req/index.ts')).returnValid(req)

  const catalog: CatalogPostReq['body'] & Partial<Catalog> = { ...body }
  catalog.owner = catalog.owner ?? sessionState.account
  assertAccountRole(sessionState, catalog.owner, 'admin')

  const plugin = await findUtils.getPlugin(catalog.plugin)
  catalog.capabilities = plugin.metadata.capabilities

  catalog._id = nanoid()
  catalog.created = catalog.updated = {
    id: sessionState.user.id,
    name: sessionState.user.name,
    date: new Date().toISOString()
  }

  const validCatalog = await validateCatalog(catalog)
  Object.assign(validCatalog, await prepareCatalog(validCatalog))
  await mongo.catalogs.insertOne(validCatalog)

  if (config.privateEventsUrl && config.secretKeys.events) {
    sendCatalogEvent(validCatalog, 'a été créé', 'create', sessionState)
  }
  delete validCatalog.secrets // Do not return secrets in the response
  res.status(200).json(validCatalog)
})

// Get a catalog
router.get('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  delete catalog.secrets // Do not return secrets in the response
  res.status(200).json(catalog)
})

// Patch some fields of a catalog
router.patch('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  // Restrict the parts of the catalog that can be edited
  const acceptedParts = Object.keys(catalogSchema.properties)
    .filter(k => sessionState.user.adminMode || !(catalogSchema.properties)[k].readOnly)
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

  const patch: Record<string, any> = { $set: {} }
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
  const patchedCatalog = await validateCatalog({ ...catalog, ...req.body })
  const preparedCatalog = await prepareCatalog(patchedCatalog)
  Object.assign(patch.$set, preparedCatalog)
  Object.assign(patchedCatalog, preparedCatalog)

  await mongo.catalogs.updateOne({ _id: req.params.id }, patch)
  if (config.privateEventsUrl && config.secretKeys.events) {
    sendCatalogEvent(patchedCatalog, 'a été modifié', 'patch', sessionState)
  }
  delete patchedCatalog.secrets // Do not return secrets in the response
  res.status(200).json(patchedCatalog)
})

// Delete a catalog (and all its publications if deletePublications query)
router.delete('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  // Delete also all publications for this catalog if asked
  if (req.query.deletePublications) {
    await mongo.publications.updateMany(
      { 'catalog.id': req.params.id },
      { $set: { action: 'delete', status: 'waiting' } }
    )

    // The catalog will be deleted by the publication task,
    // After each publication is deleted
    await mongo.catalogs.updateOne(
      { _id: req.params.id },
      { $set: { deletionRequested: true } }
    )
  } else { // Delete only publication's links
    await mongo.publications.deleteMany({ 'catalog.id': req.params.id })
    await mongo.catalogs.deleteOne({ _id: req.params.id })
  }
  // Delete all imports for this catalog
  await mongo.imports.deleteMany({ 'catalog.id': req.params.id })

  if (config.privateEventsUrl && config.secretKeys.events) {
    const msg = req.query.deletePublications ? 'a été supprimé avec ses publications' : 'a été supprimé'
    sendCatalogEvent(catalog, msg, 'delete', sessionState)
  }
  res.status(204).send()
})

// Get the list of remote resources from a catalog
router.get('/:id/resources', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  // Execute the plugin function
  const plugin = await findUtils.getPlugin(catalog.plugin)
  if (!plugin.metadata.capabilities.includes('import')) throw httpError(501, 'Plugin does not support listing resources')
  const datasets = await plugin.list({
    catalogConfig: catalog.config,
    secrets: decipherSecrets(catalog.secrets, config.cipherPassword),
    params: req.query as Record<string, any>
  })

  res.status(200).json(datasets)
})
