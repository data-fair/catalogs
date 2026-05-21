import type { Plugin } from '#types'

import { Router } from 'express'
import { assertAccountRole, session } from '@data-fair/lib-express'
import { getPlugin } from './service.ts'

const router = Router()
export default router

// Get a plugin descriptor (schemas + metadata) resolved from the registry.
// The plugin list itself is read by the UI directly from the registry API.
router.get('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  const { plugin, pkg } = await getPlugin(req.params.id, sessionState.account)

  res.send({
    id: req.params.id,
    name: pkg.name,
    description: pkg.description,
    version: pkg.version,
    configSchema: plugin.configSchema,
    listFiltersSchema: plugin.listFiltersSchema,
    importFiltersSchema: plugin.importFiltersSchema,
    publicationFiltersSchema: plugin.publicationFiltersSchema,
    importConfigSchema: plugin.importConfigSchema,
    metadata: plugin.metadata
  } as Plugin)
})
