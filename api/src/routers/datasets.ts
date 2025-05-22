import { Router } from 'express'

import { assertReqInternalSecret } from '@data-fair/lib-express'
import { internalError } from '@data-fair/lib-node/observer.js'

import mongo from '#mongo'
import config from '#config'

const router = Router()
export default router

// Update publications when a dataset is updated
router.post('/', async (req, res) => {
  assertReqInternalSecret(req, config.secretKeys.catalogs)

  if (!req.body.update || !req.body.delete) {
    // Non blocking error
    internalError('catalogs-data-fair-webhook', 'Missing datasets in request body')
  }

  await mongo.publications.updateMany(
    { 'dataFairDataset.id': { $in: req.body.update || [] } },
    { $set: { status: 'waiting' } }
  )

  await mongo.publications.updateMany(
    { 'dataFairDataset.id': { $in: req.body.delete || [] } },
    {
      $set: {
        action: 'delete',
        // TODO: We really delete the publication when the dataset is deleted ?
        // Or just deleting the publication document, but not the remote dataset ?
        // status: 'waiting'
      }
    }
  )

  res.status(204).send()
})
