import type { Publication } from '#types'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { assertAccountRole, session, httpError } from '@data-fair/lib-express'
import mongo from '#mongo'
import findUtils from '../utils/find.ts'

const router = Router()
export default router

/**
 * Check that a publication object is valid
 */
const validatePublication = async (pub: Partial<Publication>) => {
  return (await import('#types/publication/index.ts')).returnValid(pub)
}

// Get the list of publications
router.get('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, ['contrib', 'admin'])

  const params = (await import('../../doc/publications/get-req/index.ts')).returnValid(req.query)
  const sort = findUtils.sort(params.sort || 'lastPublicationDate:-1,created.date:-1')
  const { skip, size } = findUtils.pagination(params)
  const project = findUtils.project(params.select)
  const query = findUtils.filterPermissions(params, sessionState)
  const queryWithFilters = Object.assign(findUtils.query(params, { plugin: 'plugin', owner: 'owner' }), query)

  const [results, count] = await Promise.all([
    size > 0 ? mongo.publications.find(queryWithFilters).limit(size).skip(skip).sort(sort).project(project).toArray() : Promise.resolve([]),
    mongo.publications.countDocuments(query),
  ])

  res.json({ results, count })
})

// Publish a data-fair dataset (create a publication that will be processed by the worker)
router.post('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const { body } = (await import('#doc/publications/post-req/index.ts')).returnValid(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  // Check if the catalog exists
  const catalog = await mongo.catalogs.findOne({ _id: body.catalog.id })
  if (!catalog) throw httpError(404, 'Catalog not found')

  // Check if the user has same right on the catalog
  if (
    catalog.owner.type !== sessionState.account.type ||
    catalog.owner.id !== sessionState.account.id ||
    catalog.owner.department !== sessionState.account.department
  ) {
    throw httpError(403, 'You do not have the right to publish this catalog')
  }

  const pub: Partial<Publication> = { ...body }
  pub._id = nanoid()
  pub.owner = sessionState.account
  pub.status = 'waiting'
  pub.created = {
    id: sessionState.user.id,
    name: sessionState.user.name,
    date: new Date().toISOString()
  }

  const validPublication = await validatePublication(pub)
  await mongo.publications.insertOne(validPublication)

  res.status(201).json(validPublication)
})

// Delete an published dataset (change status to deleted for the publication, that will be processed by the worker)
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
