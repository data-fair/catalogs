import type { Import } from '#types'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { emit as wsEmit } from '@data-fair/lib-node/ws-emitter.js'
import eventsQueue from '@data-fair/lib-node/events-queue.js'
import { assertAccountRole, session, httpError, type SessionStateAuthenticated } from '@data-fair/lib-express'
import { getNextImportDate } from '@data-fair/catalogs-shared/cron.ts'
import mongo from '#mongo'
import config from '#config'
import findUtils from '#utils/find.ts'

const router = Router()
export default router

/**
 * Helper function to send events related to catalogs
 * @param catalog The catalog object
 * @param actionText The text describing the action (e.g. "a été créé")
 * @param topicAction The action part of the topic key (e.g. "create", "delete")
 * @param sessionState Optional session state for authentication
 */
const sendImportEvent = (
  imp: Import,
  actionText: string,
  topicAction: string,
  sessionState: SessionStateAuthenticated
) => {
  if (!config.privateEventsUrl && !config.secretKeys.events) return

  eventsQueue.pushEvent({
    title: `L'import de la resource ${imp.remoteResource.title} ${actionText}`,
    topic: { key: `catalogs:import-${topicAction}:${imp._id}` },
    sender: imp.owner,
    resource: {
      type: 'catalog',
      id: imp.catalog.id,
      title: 'Catalogue associé : ' + imp.catalog.title,
    }
  }, sessionState)
}

/**
 * Check that an import object is valid
 */
const validateImport = async (imp: Partial<Import>) => {
  return (await import('#types/import/index.ts')).returnValid(imp)
}

// Get the list of imports
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
router.post('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const { body } = (await import('#doc/imports/post-req/index.ts')).returnValid(req)

  // Check if the catalog exists
  const catalog = await mongo.catalogs.findOne({ _id: body.catalog.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  // Check if an import already exists for this DataFair dataset ID and delete it
  if (body.dataFairDataset?.id) {
    const existingImport = await mongo.imports.findOne({
      'dataFairDataset.id': body.dataFairDataset.id
    })
    if (existingImport) {
      await mongo.imports.deleteOne({ _id: existingImport._id })
      sendImportEvent(existingImport, 'a été supprimé (remplacé par un nouvel import)', 'delete', sessionState)
    }
  }

  // Create new import if none exists
  const imp: Partial<Import> = { ...body }
  imp._id = nanoid()
  imp.owner = catalog.owner
  imp.status = 'waiting'
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

  sendImportEvent(validImport, 'a été créé', 'create', sessionState)
  res.status(201).json(validImport)
})

router.patch('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  if (!req.params.id) throw httpError(400, 'Import ID is required')

  const importDoc = await mongo.imports.findOne({ _id: req.params.id })
  if (!importDoc) throw httpError(404, 'Import not found')
  assertAccountRole(sessionState, importDoc.owner, 'admin')

  // Get the import schema to check which fields can be edited
  const importSchema = (await import('#types/import/index.ts')).resolvedSchema

  // Restrict the parts of the import that can be edited
  const acceptedParts = Object.keys(importSchema.properties)
    .filter(k => sessionState.user.adminMode || !(importSchema.properties)[k].readOnly || k === 'owner' || k === 'status')

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

  // Set the next import date based on scheduling if scheduling was updated
  if (req.body.scheduling !== undefined) {
    if (Array.isArray(req.body.scheduling) && req.body.scheduling.length === 0) {
      req.body.nextImportDate = null
    } else {
      req.body.nextImportDate = getNextImportDate(req.body.scheduling)
    }
  }

  req.body.updated = {
    id: sessionState.user.id,
    name: sessionState.user.name,
    date: new Date().toISOString()
  }

  const patch: Record<string, any> = { }
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
  const patchedImport = await validateImport({ ...importDoc, ...req.body })
  await mongo.imports.updateOne({ _id: req.params.id }, patch)

  sendImportEvent(patchedImport, 'a été modifié', 'update', sessionState)
  await wsEmit(`import/${req.params.id}`, patchedImport)
  res.status(200).json(patchedImport)
})

router.delete('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  const deletedImport = await mongo.imports.findOneAndDelete({ _id: req.params.id })
  if (!deletedImport) throw httpError(404, 'Import not found')
  sendImportEvent(deletedImport, 'a été supprimé', 'delete', sessionState)

  res.status(204).send()
})
