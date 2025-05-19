import type { Export } from '#types'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { assertAccountRole, session, httpError } from '@data-fair/lib-express'
import mongo from '#mongo'
import findUtils from '../utils/find.ts'

const router = Router()
export default router

/**
 * Check that an export object is valid
 */
const validateExport = async (exp: Partial<Export>) => {
  return (await import('#types/export/index.ts')).returnValid(exp)
}

// Get the list of exports
router.get('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, ['contrib', 'admin'])

  const params = (await import('../../doc/exports/get-req/index.ts')).returnValid(req.query)
  const sort = findUtils.sort(params.sort)
  const { skip, size } = findUtils.pagination(params)
  const project = findUtils.project(params.select)
  const query = findUtils.query(params, sessionState) // Check permissions
  const queryWithFilters = { ...query }

  const [results, count] = await Promise.all([
    size > 0 ? mongo.exports.find(queryWithFilters).limit(size).skip(skip).sort(sort).project(project).toArray() : Promise.resolve([]),
    mongo.exports.countDocuments(query),
  ])

  res.json({ results, count })
})

// Export a data-fair dataset (create an export document that will be processed by the worker)
router.post('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const { body } = (await import('#doc/exports/post-req/index.ts')).returnValid(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  // Check if the catalog exists
  const catalogExists = await mongo.catalogs.countDocuments({ _id: body.catalogId }) === 1
  if (!catalogExists) throw httpError(404, 'Catalog not found')

  const exp: Partial<Export> = { ...body }
  exp._id = nanoid()
  exp.owner = sessionState.account
  exp.status = 'waiting'
  exp.created = {
    id: sessionState.user.id,
    name: sessionState.user.name,
    date: new Date().toISOString()
  }

  const validExport = await validateExport(exp)
  await mongo.exports.insertOne(validExport)

  res.status(201).json(validExport)
})

// Delete an exported dataset (change status to deleted for the export document, that will be processed by the worker)
// router.delete('/:id/dataset/:datasetId', async (req, res) => {
//   assertReqInternalSecret(req, config.secretKeys.catalogs)
//   const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
//   if (!catalog) throw httpError(404, 'Catalog not found')

//   const plugin = await findUtils.getPlugin(catalog.plugin)
//   if (!plugin.metadata.capabilities.includes('publishDatasets')) throw httpError(501, 'Plugin does not support deleting datasets')
//   await plugin.deleteDataset(catalog.config, req.params.datasetId)
//   // await plugin.deleteDataset(catalog.config, req.params.datasetId, req.params.resourceId) // Can also manage resources

//   res.sendStatus(204)
// })
