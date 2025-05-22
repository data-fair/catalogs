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
const validateImport = async (imp: Partial<Import>) => {
  return (await import('#types/import/index.ts')).returnValid(imp)
}

// Import a distant dataset (create an import document that will be processed by the worker)
router.post('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const { body } = (await import('#doc/imports/post-req/index.ts')).returnValid(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  // Check if the catalog exists
  const catalogExists = await mongo.catalogs.countDocuments({ _id: body.catalog.id }) === 1
  if (!catalogExists) throw httpError(404, 'Catalog not found')

  const imp: Partial<Import> = { ...body }
  imp._id = nanoid()
  imp.owner = sessionState.account
  imp.status = 'waiting'
  imp.created = {
    id: sessionState.user.id,
    name: sessionState.user.name,
    date: new Date().toISOString()
  }

  const validImport = await validateImport(imp)
  await mongo.imports.insertOne(validImport)

  res.status(201).json(validImport)
})
