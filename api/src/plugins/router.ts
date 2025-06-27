import type { Plugin } from '#types'
import type { Request } from 'express'

import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'
import { assertAccountRole, httpError, session } from '@data-fair/lib-express'
import { getPlugin, installPlugin, getTarball } from './service.ts'
import mongo from '#mongo'
import config from '#config'

const router = Router()
export default router

const pluginsDir = path.resolve(config.dataDir, 'plugins')
fs.ensureDirSync(pluginsDir)

// Install a new plugin or update an existing one
router.post('/', getTarball, async (req: Request & { file?: Express.Multer.File }, res) => {
  await session.reqAdminMode(req)
  const result = await installPlugin(req)
  res.send(result)
})

// List installed plugins
router.get('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')

  const dirs = await fs.readdir(pluginsDir)
  const results: Plugin[] = []
  for (const dir of dirs) {
    const pluginInfo = await fs.readJson(path.join(pluginsDir, dir, 'plugin.json'))
    const plugin = await getPlugin(dir)

    results.push({
      id: pluginInfo.id,
      name: pluginInfo.name,
      description: pluginInfo.description,
      version: pluginInfo.version,
      configSchema: plugin.configSchema,
      metadata: plugin.metadata
    } as Plugin)
  }

  const aggregationResult = (
    await mongo.catalogs
      .aggregate([{ $group: { _id: '$plugin', count: { $sum: 1 } } }])
      .toArray()
  ).reduce((acc:any, { _id, count }: any) => {
    acc[_id] = count
    return acc
  }, {})

  res.send({
    count: results.length,
    results,
    facets: { usages: aggregationResult || {} }
  })
})

// Get a plugin with its metadata
router.get('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, 'admin')
  let pluginInfo
  try {
    pluginInfo = await fs.readJson(path.join(pluginsDir, req.params.id, 'plugin.json'))
  } catch (e: any) {
    throw httpError(404, 'Plugin not found')
  }
  const plugin = await getPlugin(req.params.id)

  res.send({
    id: pluginInfo.id,
    name: pluginInfo.name,
    description: pluginInfo.description,
    version: pluginInfo.version,
    configSchema: plugin.configSchema,
    listFiltersSchema: plugin.listFiltersSchema,
    importConfigSchema: plugin.importConfigSchema,
    metadata: plugin.metadata
  } as Plugin)
})

router.delete('/:id', async (req, res) => {
  await session.reqAdminMode(req)
  if (!req.params.id) throw httpError(400, 'Plugin ID is required')

  const pluginPath = path.join(pluginsDir, req.params.id)
  if (!fs.existsSync(pluginPath)) throw httpError(404, 'Plugin not found')

  await fs.remove(pluginPath)
  res.status(204).send()
})
