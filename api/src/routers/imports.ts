import type { Import } from '#types'

import { Router } from 'express'
import { nanoid } from 'nanoid'

import { assertAccountRole, session } from '@data-fair/lib-express'
import mongo from '#mongo'

const router = Router()
export default router

/**
 * Check that a import object is valid
 */
const validateImport = async (importD: Partial<Import>) => {
  return (await import('#types/import/index.ts')).returnValid(importD)
}

// Create a new import
router.post('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  const { body } = (await import('../../doc/imports/post-req/index.ts')).returnValid(req)

  const importD: Partial<Import> = { ...body }
  importD.owner = sessionState.account
  assertAccountRole(sessionState, importD.owner, 'admin')

  importD._id = nanoid()
  importD.status = 'pending'
  importD.created = {
    id: sessionState.user.id,
    name: sessionState.user.name,
    date: new Date().toISOString()
  }

  const validImport = await validateImport(importD)
  await mongo.imports.insertOne(validImport)

  res.status(201).json(validImport)
})
