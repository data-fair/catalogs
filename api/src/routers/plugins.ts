import type { Plugin } from '#types'

import { exec as execCallback } from 'child_process'
import { promisify } from 'util'
import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'
import tmp from 'tmp-promise'
import { assertAccountRole, httpError, session } from '@data-fair/lib-express'
import findUtils, { removePluginFromCache } from '../utils/find.ts'
import mongo from '#mongo'
import config from '#config'

const exec = promisify(execCallback)

const router = Router()
export default router

const pluginsDir = path.resolve(config.dataDir, 'plugins')
fs.ensureDirSync(pluginsDir)
const tmpDir = config.tmpDir || path.resolve(config.dataDir, 'tmp')
fs.ensureDirSync(tmpDir)

tmp.setGracefulCleanup()

// Install a new plugin or update an existing one
router.post('/', async (req, res) => {
  await session.reqAdminMode(req)
  const { body } = (await import('../../doc/plugins/post-req/index.ts')).returnValid(req)

  const dir = await tmp.dir({ unsafeCleanup: true, tmpdir: tmpDir, prefix: 'plugin-install' })
  const id = body.name.replace('/', '-')

  try {
    // create a pseudo npm package with a dependency to the plugin referenced from the registry
    await fs.writeFile(path.join(dir.path, 'package.json'), JSON.stringify({
      name: id,
      type: 'module',
      dependencies: {
        [body.name]: '^' + body.version
      }
    }, null, 2))
    await exec('npm install --omit=dev', { cwd: dir.path })

    // move the plugin to the src directory (Stripping types is currently unsupported for files under node_modules)
    await fs.move(path.join(dir.path, 'node_modules', body.name), path.join(dir.path, 'src'), { overwrite: true })

    // generate an index.js file to export the main file
    const packageJson = await fs.readJson(path.join(dir.path, 'src', 'package.json'))
    await fs.writeFile(path.join(dir.path, 'index.ts'), `export { default } from './${path.join('src', packageJson.main || 'index.ts')}'`)
    await fs.writeFile(path.join(dir.path, 'plugin.json'), JSON.stringify({
      id,
      name: packageJson.name,
      description: packageJson.description,
      version: packageJson.version
    }, null, 2))

    await fs.move(dir.path, path.join(pluginsDir, id), { overwrite: true })
    removePluginFromCache(id) // Remove the plugin from cache to reload it
  } finally {
    try {
      await dir.cleanup()
    } catch (err) { } // ignore, directory was moved
  }

  res.send({
    id,
    name: body.name,
    version: body.version
  })
})

// List installed plugins
router.get('/', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, ['contrib', 'admin'])

  const dirs = await fs.readdir(pluginsDir)
  const results: Plugin[] = []
  for (const dir of dirs) {
    const pluginInfo = await fs.readJson(path.join(pluginsDir, dir, 'plugin.json'))
    const plugin = await findUtils.getPlugin(dir)

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
  assertAccountRole(sessionState, sessionState.account, ['contrib', 'admin'])
  let pluginInfo
  try {
    pluginInfo = await fs.readJson(path.join(pluginsDir, req.params.id, 'plugin.json'))
  } catch (e: any) {
    throw httpError(404, 'Plugin not found')
  }
  const plugin = await findUtils.getPlugin(req.params.id)

  res.send({
    id: pluginInfo.id,
    name: pluginInfo.name,
    description: pluginInfo.description,
    version: pluginInfo.version,
    configSchema: plugin.configSchema,
    filtersSchema: plugin.filtersSchema,
    metadata: plugin.metadata
  } as Plugin)
})

router.delete('/:id', async (req, res) => {
  await session.reqAdminMode(req)
  await fs.remove(path.join(pluginsDir, req.params.id))
  res.status(204).send()
})
