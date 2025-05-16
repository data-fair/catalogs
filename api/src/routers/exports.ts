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
const validateExport = async (exportD: Partial<Export>) => {
  return (await import('#types/export/index.ts')).returnValid(exportD)
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

  // TODO: we consider that the ui don't allow the user to create an export with a dataset where the owner is not the same as the catalog
  // In the worker, we get the dataset and check if the owner is the same as the catalog, then we can publish the dataset by calling the plugin
  // const { dataset, publication } = (await import('../../doc/catalogs/dataset/post-req/index.ts')).returnValid(req.body)
  // if (dataset.owner && (catalog.owner.type !== dataset.owner.type || catalog.owner.id !== dataset.owner.id)) {
  //   throw httpError(403, 'You do not have permission to publish this dataset in this catalog because the owner of the dataset is different from the owner of the catalog')
  // }

  // TODO: Move to the worker
  // const plugin = await findUtils.getPlugin(catalog.plugin)
  // if (!plugin.metadata.capabilities.includes('publishDatasets')) throw httpError(501, 'Plugin does not support publishing datasets')
  // const publicationRes = await plugin.publishDataset(catalog.config, dataset, publication)

  const exportD: Partial<Export> = { ...body }

  exportD._id = nanoid()
  exportD.owner = sessionState.account
  exportD.status = 'waiting'

  const validExport = await validateExport(exportD)
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
