import type { Catalog, Import } from '#types'
import type { Request } from 'express'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { assertAccountRole, assertReqScope, getAccountRole, session, httpError } from '@data-fair/lib-express'
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import { getNextImportDate } from '@data-fair/catalogs-shared/cron.ts'
import mongo from '#mongo'
import findUtils from '#utils/find.ts'
import { resolvedSchema as importSchema } from '#types/import/index.ts'
import { getPlugin } from '../plugins/service.ts'
import { acceptedScopes, requireOperationScope } from '../scopes.ts'
import { importPatchFields, patchableImportFields } from './patch-fields.ts'
import { sendImportEvent, validateImport, updateImport } from './service.ts'
import { agentSchema } from '#utils/agent-schema.ts'

const router = Router()
export default router

// Get the list of imports
router.get('/', requireOperationScope('listImports'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  const params = (await import('../../doc/imports/get-req/index.ts')).returnValid(req.query)
  const sort = findUtils.sort(params.sort || 'lastImportDate:-1,created.date:-1')
  const { skip, size } = findUtils.pagination(params, 1000)
  const project = { logs: 0 } // Users cannot perform custom projections, and logs aren't returned when listing imports.
  const query = findUtils.filterPermissions(params, sessionState)
  const queryWithFilters = Object.assign(findUtils.query(params, { catalogId: 'catalog.id', dataFairDatasetId: 'dataFairDataset.id' }), query)

  const [results, count] = await Promise.all([
    size > 0 ? mongo.imports.find(queryWithFilters).limit(size).skip(skip).sort(sort).project(project).toArray() : Promise.resolve([]),
    mongo.imports.countDocuments(queryWithFilters),
  ])

  res.json({ results, count })
})

// Get a specific import by ID
router.get('/:id', requireOperationScope('getImport'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')
  const { id } = req.params
  if (!id) throw httpError(400, 'Import ID is required')
  const importDoc = await mongo.imports.findOne({ _id: id })
  if (!importDoc) throw httpError(404, 'Import not found')
  assertAccountRole(sessionState, importDoc.owner, 'admin')
  res.json(importDoc)
})

// Import a distant dataset (create an import document that will be processed by the worker)
router.post('/', requireOperationScope('postImport'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const { body } = (await import('#doc/imports/post-req/index.ts')).returnValid(req)
  // pointing an import at an existing dataset (overwritten by each run) needs the admin tier, as on PATCH
  const adminFields: readonly string[] = importPatchFields.admin
  if (Object.keys(body).some(k => adminFields.includes(k))) assertReqScope(req, acceptedScopes('catalogs', 'admin'))

  // Check if the catalog exists
  const catalog = await mongo.catalogs.findOne({ _id: body.catalog.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  // Check if an import already exists for this DataFair dataset ID and delete it
  if (body.dataFairDataset?.id) {
    const existingImport = await mongo.imports.findOne({
      'dataFairDataset.id': body.dataFairDataset.id
    })
    if (existingImport && getAccountRole(sessionState, existingImport.owner) === 'admin') {
      await mongo.imports.deleteOne({ _id: existingImport._id })
      sendImportEvent(existingImport, 'delete', sessionState, 'replace')
    }
  }

  // Create new import if none exists
  const imp: Partial<Import> = { ...body }
  imp._id = nanoid()
  imp.owner = catalog.owner
  imp.status = 'waiting'
  // the validator applies no defaults: the worker only schedules imports with isSchedulingActive true
  imp.isSchedulingActive = imp.isSchedulingActive ?? importSchema.properties.isSchedulingActive.default
  imp.waitingAt = new Date().toISOString()
  imp.created = imp.updated = {
    id: sessionState.user.id,
    name: sessionState.user.name,
    date: new Date().toISOString()
  }

  // Set the next import date based on scheduling
  if (imp.scheduling) imp.nextImportDate = getNextImportDate(imp.scheduling)

  const validImport = await validateImport(imp)
  await mongo.imports.insertOne(validImport)

  sendImportEvent(validImport, 'create', sessionState)
  res.status(201).json(validImport)
})

router.patch('/:id', requireOperationScope('patchImport'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  if (!req.params.id) throw httpError(400, 'Import ID is required')

  const importDoc = await mongo.imports.findOne({ _id: req.params.id })
  if (!importDoc) throw httpError(404, 'Import not found')
  assertAccountRole(sessionState, importDoc.owner, 'admin')

  // Restrict the parts of the import that can be edited
  const acceptedParts = patchableImportFields(!!sessionState.user.adminMode)
  const adminFields: readonly string[] = importPatchFields.admin
  // the admin parts need the admin tier of a scoped session, checked before anything is written
  if (Object.keys(req.body).some(k => adminFields.includes(k))) assertReqScope(req, acceptedScopes('catalogs', 'admin'))

  for (const key in req.body) {
    if (!acceptedParts.includes(key)) throw httpError(400, `Unsupported patch part ${key}`)
    // check if the user has the right to change to this owner
    if (key === 'owner') assertAccountRole(sessionState, req.body.owner, 'admin', { allAccounts: true })
  }

  // Only allow changing status to 'waiting' if not currently running
  if (req.body.status) {
    if (req.body.status !== 'waiting') {
      throw httpError(400, 'Only changing status to waiting is allowed')
    } else {
      req.body.waitingAt = new Date().toISOString()
    }
    if (importDoc.status === 'running') {
      throw httpError(400, 'The import is currently running, you cannot change its status')
    }
  }

  const patchedImport = await updateImport(importDoc, req.body, sessionState)
  res.status(200).json(patchedImport)
})

router.delete('/:id', requireOperationScope('deleteImport'), async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const importDoc = await mongo.imports.findOne({ _id: req.params.id })
  if (!importDoc) throw httpError(404, 'Import not found')
  assertAccountRole(sessionState, importDoc.owner, 'admin')

  await mongo.imports.deleteOne({ _id: req.params.id })
  sendImportEvent(importDoc, 'delete', sessionState)

  res.status(204).send()
})

// the whole-document configuration of an import, the agent editor's read and save; config only when
// the catalog has the importConfig capability
const configurationKeys = ['config', 'isSchedulingActive', 'shouldUpdateMetadata', 'shouldUpdateSchema', 'scheduling'] as const
const configurationKeysOf = (catalog: Catalog | null) => configurationKeys
  .filter(k => k !== 'config' || !!catalog?.capabilities?.includes('importConfig'))
const importConfiguration = (imp: Import, catalog: Catalog | null) => {
  const conf: Record<string, any> = {}
  for (const key of configurationKeysOf(catalog)) {
    if (imp[key] !== undefined) conf[key] = imp[key]
  }
  return conf
}

const findImportAndCatalog = async (req: Request) => {
  const sessionState = await session.reqAuthenticated(req)
  const importDoc = await mongo.imports.findOne({ _id: req.params.id as string })
  if (!importDoc) throw httpError(404, 'Import not found')
  assertAccountRole(sessionState, importDoc.owner, 'admin')
  const catalog = await mongo.catalogs.findOne({ _id: importDoc.catalog.id })
  return { sessionState, importDoc, catalog }
}

router.get('/:id/configuration', requireOperationScope('getImportConfiguration'), async (req, res) => {
  const { importDoc, catalog } = await findImportAndCatalog(req)
  res.json(importConfiguration(importDoc, catalog))
})

router.get('/:id/configuration-schema', requireOperationScope('getImportConfigurationSchema'), async (req, res) => {
  const { importDoc, catalog } = await findImportAndCatalog(req)
  if (!catalog) throw httpError(404, 'Catalog not found')
  const keys = configurationKeysOf(catalog)
  const builder = jsonSchema(importSchema).pickProperties(keys)
  if (keys.includes('config')) {
    const { plugin } = await getPlugin(catalog.plugin, catalog.owner)
    if (plugin.importConfigSchema) builder.addProperty('config', plugin.importConfigSchema)
  }
  res.json(agentSchema({ ...builder.schema, additionalProperties: false }, {
    owner: importDoc.owner,
    catalogConfig: catalog.config,
    resourceId: importDoc.remoteResource.id
  }))
})

// replaces the configuration: a missing optional part takes its default or is removed; without the importConfig
// capability the stored config is kept
router.put('/:id/configuration', requireOperationScope('putImportConfiguration'), async (req, res) => {
  const { sessionState, importDoc, catalog } = await findImportAndCatalog(req)
  const keys: readonly string[] = configurationKeysOf(catalog)
  const body = req.body ?? {}
  if (typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'The configuration must be an object')
  for (const key of Object.keys(body)) {
    if (!keys.includes(key)) throw httpError(400, `Unsupported configuration part ${key}`)
  }
  const changes: Record<string, any> = {}
  // a missing part takes its schema default (isSchedulingActive), or is removed
  const properties: Record<string, { default?: unknown }> = importSchema.properties
  for (const key of keys) changes[key] = body[key] ?? properties[key]?.default ?? null
  const patchedImport = await updateImport(importDoc, changes, sessionState)
  res.status(200).json(importConfiguration(patchedImport, catalog))
})
