import type { Import } from '#types'

import { Router } from 'express'
import { nanoid } from 'nanoid'
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
  const project = findUtils.project(params.select)
  const query = findUtils.filterPermissions(params, sessionState)
  const queryWithFilters = Object.assign(findUtils.query(params, { catalogId: 'catalog.id' }), query)

  const [results, count] = await Promise.all([
    size > 0 ? mongo.imports.find(queryWithFilters).limit(size).skip(skip).sort(sort).project(project).toArray() : Promise.resolve([]),
    mongo.imports.countDocuments(query),
  ])

  res.json({ results, count })
})

// Import a distant dataset (create an import document that will be processed by the worker)
router.post('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const { body } = (await import('#doc/imports/post-req/index.ts')).returnValid(req)

  // Check if the catalog exists
  const catalog = await mongo.catalogs.findOne({ _id: body.catalog.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')

  // Check if an import with the same catalog.id and remoteResource.id already exists
  const existingImport = await mongo.imports.findOne({
    'catalog.id': body.catalog.id,
    'remoteResource.id': body.remoteResource.id
  })

  if (existingImport) {
    // Update existing import: reset status to waiting and clear errors
    const updatedImport = await mongo.imports.findOneAndUpdate(
      { _id: existingImport._id },
      {
        $set: {
          status: 'waiting',
          updated: {
            id: sessionState.user.id,
            name: sessionState.user.name,
            date: new Date().toISOString()
          }
        },
        $unset: {
          error: ''
        }
      },
      { returnDocument: 'after' }
    )

    if (!updatedImport) {
      throw httpError(500, 'Failed to update existing import')
    }

    return res.status(200).json(updatedImport)
  }

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

  const imp = await mongo.imports.updateOne({ _id: id }, {
    $set: {
      status: 'waiting',
      error: undefined
    }
  })

  if (imp.matchedCount === 0) throw httpError(404, 'Import not found')
  res.status(200).json(imp)
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
