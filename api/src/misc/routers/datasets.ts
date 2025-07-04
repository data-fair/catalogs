// Webhooks for Data Fair

import Debug from 'debug'
import { Router } from 'express'
import { assertReqInternalSecret } from '@data-fair/lib-express'
import { internalError } from '@data-fair/lib-node/observer.js'
import mongo from '#mongo'
import config from '#config'

const debug = Debug('webhooks-data-fair')
const router = Router()
export default router

// Update/Delete publications when a dataset is updated/deleted in Data Fair
router.post('/', async (req, res) => {
  assertReqInternalSecret(req, config.secretKeys.catalogs)
  debug('Incoming data fair webhook for datasets update/delete', req.body)

  if (!req.body.update || !req.body.delete) { // Non blocking error
    internalError('catalogs-data-fair-webhook', 'Missing datasets in request body')
  }

  await mongo.publications.updateMany(
    { 'dataFairDataset.id': { $in: req.body.update || [] } },
    { $set: { status: 'waiting' } }
  )

  // If the dataset is deleted, it will no longer be accessible in the catalog, so it must also be deleted from the catalog.
  await mongo.publications.updateMany(
    { 'dataFairDataset.id': { $in: req.body.delete || [] } },
    {
      $set: {
        action: 'delete',
        status: 'waiting'
      }
    }
  )

  // Delete import link if the dataset is deleted
  if (req.body.delete && req.body.delete.length > 0) {
    await mongo.imports.deleteMany(
      { 'dataFairDataset.id': { $in: req.body.delete } }
    )
  }

  res.status(204).send()
})
