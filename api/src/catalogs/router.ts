import type { Catalog } from '#types'
import type { CatalogPostReq } from '#doc/catalogs/post-req/index.ts'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { assertAccountRole, session, httpError } from '@data-fair/lib-express'
import { decipherSecrets } from '@data-fair/catalogs-shared/cipher.ts'
import { resolvedSchema as catalogSchema } from '#types/catalog/index.ts'
import mongo from '#mongo'
import config from '#config'
import findUtils from '#utils/find.ts'
import { agentSchema } from '#utils/agent-schema.ts'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { getPlugin } from '../plugins/service.ts'
import { sendCatalogEvent, prepareCatalog, validateCatalog, updateCatalog } from './service.ts'
import { catalogFacets, catalogsWithCounts } from './aggregations.ts'
import { requireOperationScope } from '../scopes.ts'

const router = Router()
export default router

// Get the list of catalogs
router.get('/', requireOperationScope('listCatalogs'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  const params = (await import('../../doc/catalogs/get-req/index.ts')).returnValid(req.query)
  const sort = findUtils.sort(params.sort || 'updated.date:-1')
  const { skip, size } = findUtils.pagination(params)
  const project = findUtils.project(params.select)
  const query = findUtils.filterPermissions(params, sessionState)
  const filters = findUtils.query(params, { plugins: 'plugin', capabilities: 'capabilities' })
  const queryWithFilters = Object.assign(filters, query)

  // Filter by owner (if showAll)
  const showAll = params.showAll === 'true'
  if (showAll) {
    if (params.owners) {
      queryWithFilters.$or = params.owners.split(',').map(owner => {
        const [type, id, department] = owner.split(':')
        if (!type || !id) throw httpError(400, 'Invalid owner format')
        const filter: any = { 'owner.type': type, 'owner.id': id }
        if (department) filter['owner.department'] = department
        return filter
      })
    }
  } else {
    // Exclude catalogs marked for deletion
    query.deletionRequested = { $ne: true } // Exclude from count
    queryWithFilters.deletionRequested = { $ne: true }
  }

  const [results, count, facets] = await Promise.all([
    size > 0
      ? mongo.catalogs.aggregate(catalogsWithCounts(queryWithFilters, sort, skip, size, project)).toArray()
      : Promise.resolve([]),
    mongo.catalogs.countDocuments(query),
    mongo.catalogs.aggregate(catalogFacets(query, showAll)).toArray()
  ])

  // Remove secrets from each result
  results.forEach(catalog => delete catalog.secrets)
  res.json({ results, count, facets: facets[0] })
})

// Create a new catalog
router.post('/', requireOperationScope('postCatalog'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const { body } = (await import('../../doc/catalogs/post-req/index.ts')).returnValid(req)

  const catalog: CatalogPostReq['body'] & Partial<Catalog> = { ...body }
  catalog.owner = catalog.owner ?? sessionState.account
  assertAccountRole(sessionState, catalog.owner, 'admin')

  const { plugin } = await getPlugin(catalog.plugin, catalog.owner)
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

  sendCatalogEvent(validCatalog, 'create', sessionState)
  delete validCatalog.secrets // Do not return secrets in the response
  res.status(201).json(validCatalog)
})

// Get a catalog
router.get('/:id', requireOperationScope('getCatalog'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  delete catalog.secrets // Do not return secrets in the response
  res.status(200).json(catalog)
})

// Patch some fields of a catalog
router.patch('/:id', requireOperationScope('patchCatalog'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  // Restrict the parts of the catalog that can be edited
  const acceptedParts = Object.keys(catalogSchema.properties)
    .filter(k => sessionState.user.adminMode || !(catalogSchema.properties)[k].readOnly || k === 'owner')
  for (const key in req.body) {
    if (!acceptedParts.includes(key)) throw httpError(400, `Unsupported patch part ${key}`)
    // Check if the user has the right to change to this owner
    if (key === 'owner') {
      assertAccountRole(sessionState, req.body.owner, 'admin', { allAccounts: true })
      // Change also all publications and imports to the new owner
      const update: Record<string, string> = {
        'owner.id': req.body.owner.id,
        'owner.type': req.body.owner.type
      }
      if (req.body.owner.department) {
        update['owner.department'] = req.body.owner.department
        update['owner.departmentName'] = req.body.owner.departmentName
      }
      await mongo.publications.updateMany({ 'catalog.id': req.params.id }, { $set: update })
      await mongo.imports.updateMany({ 'catalog.id': req.params.id }, { $set: update })
    }
  }
  const patchedCatalog = await updateCatalog(catalog, req.body, sessionState)
  res.status(200).json(patchedCatalog)
})

// Delete a catalog (and all its publications if deletePublications query)
router.delete('/:id', requireOperationScope('deleteCatalog'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  // Delete also all publications for this catalog if asked
  // a query string: only 'true' asks it ('false' is a truthy string)
  const deletePublications = req.query.deletePublications === 'true'
  if (deletePublications) {
    const result = await mongo.publications.updateMany(
      { 'catalog.id': req.params.id },
      { $set: { action: 'delete', status: 'waiting' } }
    )

    if (result.modifiedCount === 0) {
      // No publications found, delete the catalog directly
      await mongo.catalogs.deleteOne({ _id: req.params.id })
    } else {
      // Publications found and marked for deletion
      // The catalog will be deleted by the publication task,
      // After each publication is deleted
      await mongo.catalogs.updateOne(
        { _id: req.params.id },
        { $set: { deletionRequested: true } }
      )
    }
  } else { // Delete only publication's links
    await mongo.publications.deleteMany({ 'catalog.id': req.params.id })
    await mongo.catalogs.deleteOne({ _id: req.params.id })
  }
  // Delete all imports for this catalog but not the imported datasets
  await mongo.imports.deleteMany({ 'catalog.id': req.params.id })

  sendCatalogEvent(catalog, 'delete', sessionState, deletePublications ? 'delete-with-publications' : 'delete')
  res.status(204).send()
})

// Explore the list of remote folders/resources from a catalog
router.get('/:id/resources', requireOperationScope('listCatalogResources'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  // Execute the plugin function
  const { plugin } = await getPlugin(catalog.plugin, catalog.owner)
  const datasets = await plugin.list({
    catalogConfig: catalog.config,
    secrets: decipherSecrets(catalog.secrets, config.cipherPassword),
    params: req.query as Record<string, any>
  })

  res.status(200).json(datasets)
})

// the whole-document configuration of a catalog, the agent editor's read and save
const configurationKeys = ['title', 'description', 'config'] as const
const catalogConfiguration = (catalog: Pick<Catalog, typeof configurationKeys[number]>) => ({
  title: catalog.title,
  ...(catalog.description !== undefined ? { description: catalog.description } : {}),
  config: catalog.config
})

router.get('/:id/configuration', requireOperationScope('getCatalogConfiguration'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')
  res.json(catalogConfiguration(catalog))
})

router.get('/:id/configuration-schema', requireOperationScope('getCatalogConfigurationSchema'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  const { plugin } = await getPlugin(catalog.plugin, catalog.owner)
  const builder = jsonSchema(catalogSchema).pickProperties([...configurationKeys])
  if (plugin.configSchema) builder.addProperty('config', plugin.configSchema)
  // the top-level layout places the UI's activity slot, nothing an agent editor can render
  const { layout, ...schema } = builder.schema
  res.json(agentSchema({ ...schema, additionalProperties: false }, { owner: catalog.owner }))
})

// replaces the configuration: a missing description is removed, the masked secrets read by the GET
// keep the stored ones
router.put('/:id/configuration', requireOperationScope('putCatalogConfiguration'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  const body = req.body ?? {}
  if (typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'The configuration must be an object')
  for (const key of Object.keys(body)) {
    if (!(configurationKeys as readonly string[]).includes(key)) throw httpError(400, `Unsupported configuration part ${key}`)
  }
  const changes = { title: body.title, description: body.description ?? null, config: body.config }
  const patchedCatalog = await updateCatalog(catalog, changes, sessionState)
  res.status(200).json(catalogConfiguration(patchedCatalog))
})
