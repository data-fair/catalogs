import type { Import } from '#types'

import { Router } from 'express'
import { nanoid } from 'nanoid'
import { assertAccountRole, session, httpError } from '@data-fair/lib-express'
import mongo from '#mongo'

const router = Router()
export default router

/**
 * Check that an import object is valid
 */
const validateImport = async (importD: Partial<Import>) => {
  return (await import('#types/import/index.ts')).returnValid(importD)
}

// Import a distant dataset (create an import document that will be processed by the worker)
router.post('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const { body } = (await import('#doc/imports/post-req/index.ts')).returnValid(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  // Check if the catalog exists
  const catalogExists = await mongo.catalogs.countDocuments({ _id: body.catalog.id }) === 1
  if (!catalogExists) throw httpError(404, 'Catalog not found')

  const importD: Partial<Import> = { ...body }
  importD._id = nanoid()
  importD.owner = sessionState.account
  importD.status = 'waiting'

  const validImport = await validateImport(importD)
  await mongo.imports.insertOne(validImport)

  res.status(201).json(validImport)
})
