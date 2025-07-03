import type { Import } from '#types'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { emit as wsEmit } from '@data-fair/lib-node/ws-emitter.js'
import { assertAccountRole, session, httpError } from '@data-fair/lib-express'
import { getNextImportDate } from '@data-fair/catalogs-shared/cron.ts'
import mongo from '#mongo'
import findUtils from '#utils/find.ts'

const router = Router()
export default router

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
  const { skip, size } = findUtils.pagination(params)
  const project = { logs: 0 } // Users cannot perform custom projections, and logs aren't returned when listing imports.
  const query = findUtils.filterPermissions(params, sessionState)
  const queryWithFilters = Object.assign(findUtils.query(params, { catalogId: 'catalog.id' }), query)

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

  // Create new import if none exists
  const imp: Partial<Import> = { ...body }
  imp._id = nanoid()
  imp.owner = sessionState.account
  imp.status = 'waiting'
  imp.created = imp.updated = {
    id: sessionState.user.id,
    name: sessionState.user.name,
    date: new Date().toISOString()
  }

  // Set the next import date based on scheduling
  if (imp.scheduling) imp.nextImportDate = getNextImportDate(imp.scheduling)

  const validImport = await validateImport(imp)
  await mongo.imports.insertOne(validImport)

  res.status(201).json(validImport)
})

router.patch('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  const { id } = req.params
  if (!id) throw httpError(400, 'Import ID is required')

  const importDoc = await mongo.imports.findOne({ _id: id })
  if (!importDoc) throw httpError(404, 'Import not found')
  assertAccountRole(sessionState, importDoc.owner, 'admin')

  // Get the import schema to check which fields can be edited
  const importSchema = (await import('#types/import/index.ts')).resolvedSchema

  // Restrict the parts of the import that can be edited
  const acceptedParts = Object.keys(importSchema.properties)
    .filter(k => sessionState.user.adminMode || !(importSchema.properties)[k].readOnly || 'status')

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

  // Set the next import date based on scheduling if scheduling was updated
  if (req.body.scheduling !== undefined) {
    if (Array.isArray(req.body.scheduling) && req.body.scheduling.length === 0) {
      req.body.nextImportDate = null
    } else if (req.body.scheduling) {
      req.body.nextImportDate = getNextImportDate(req.body.scheduling)
    }
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
  await mongo.imports.updateOne({ _id: id }, patch)

  await wsEmit(`import/${id}`, patchedImport)
  res.status(200).json(patchedImport)
})

router.delete('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  const { id } = req.params
  if (!id) throw httpError(400, 'Import ID is required')

  const result = await mongo.imports.deleteOne({ _id: id })
  if (result.deletedCount === 0) throw httpError(404, 'Import not found')

  res.status(204).send()
})
