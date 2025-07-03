import type { Publication } from '#types'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { emit as wsEmit } from '@data-fair/lib-node/ws-emitter.js'
import { assertAccountRole, session, httpError } from '@data-fair/lib-express'
import mongo from '#mongo'
import findUtils from '#utils/find.ts'

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
    mongo.publications.countDocuments(queryWithFilters),
  ])

  res.json({ results, count })
})

// Publish a data-fair dataset (create a publication that will be processed by the worker)
router.post('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const { body } = (await import('#doc/publications/post-req/index.ts')).returnValid(req)

  // Check if they are already a publication with the same dataFairDataset.id and catalog.id
  const existingPublication = await mongo.publications.countDocuments({
    'dataFairDataset.id': body.dataFairDataset.id,
    'catalog.id': body.catalog.id
  })
  if (existingPublication) throw httpError(409, 'Publication already exists for this dataset and catalog')

  // In overwrite mode, check if they are already a publication with the same remoteDataset.id, and delete the link
  if (body.action === 'overwrite' && body.remoteDataset?.id) {
    await mongo.publications.deleteOne({ 'remoteDataset.id': body.remoteDataset?.id })
  }

  // Check if the catalog exists
  const catalog = await mongo.catalogs.findOne({ _id: body.catalog.id })
  if (!catalog) throw httpError(404, 'Catalog not found')
  assertAccountRole(sessionState, catalog.owner, 'admin')
  // Checked by the worker :
  // - if the data-fair dataset exists
  // - the user has the admin right on the dataset

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
  await wsEmit(`publication/${validPublication._id}`, validPublication)

  res.status(201).json(validPublication)
})

// Update a publication
router.post('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  await mongo.publications.updateOne(
    { _id: req.params.id },
    { $set: { status: 'waiting' }, $unset: { logs: 1 } }
  )
  await wsEmit(`publication/${req.params.id}`, { status: 'waiting', logs: undefined })

  res.status(204).send()
})

// Delete a publication
router.delete('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  if (req.query.onlyLink === 'true') {
    await mongo.publications.deleteOne({ _id: req.params.id })
  } else {
    await mongo.publications.updateOne(
      { _id: req.params.id },
      { $set: { action: 'delete', status: 'waiting' }, $unset: { logs: 1 } }
    )
    await wsEmit(`publication/${req.params.id}`, {
      action: 'delete',
      status: 'waiting',
      logs: undefined
    })
  }

  res.status(204).send()
})
