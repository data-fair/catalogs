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
  assertAccountRole(sessionState, sessionState.account, 'admin')

  const params = (await import('../../doc/publications/get-req/index.ts')).returnValid(req.query)
  const sort = findUtils.sort(params.sort || 'lastPublicationDate:-1,created.date:-1')
  const { skip, size } = findUtils.pagination(params)
  const project = findUtils.project(params.select)
  const query = findUtils.filterPermissions(params, sessionState)
  const queryWithFilters = Object.assign(findUtils.query(params, { catalogId: 'catalog.id', dataFairDatasetId: 'dataFairDataset.id' }), query)

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
