import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog.js'
import type { Plugin } from '#types'

import { exec as execCallback } from 'child_process'
import { promisify } from 'util'
import { Router } from 'express'
import fs from 'fs-extra'
import path from 'path'
import tmp from 'tmp-promise'
import { assertAccountRole, httpError, session } from '@data-fair/lib-express'
import mongo from '#mongo'
import config from '#config'

const exec = promisify(execCallback)

const router = Router()
export default router

fs.ensureDirSync(config.dataDir)
const pluginsDir = path.resolve(config.dataDir, 'plugins')
fs.ensureDirSync(pluginsDir)
const tmpDir = config.tmpDir || path.resolve(config.dataDir, 'tmp')
fs.ensureDirSync(tmpDir)

tmp.setGracefulCleanup()

// Install a new plugin or update an existing one
router.post('/', async (req, res) => {
  await session.reqAdminMode(req)
  const { body } = (await import('../../doc/plugins/post-req/index.ts')).returnValid(req)

  const pluginDir = path.join(pluginsDir, body.id)
  const dir = await tmp.dir({ unsafeCleanup: true, tmpdir: tmpDir, prefix: 'plugin-install-' })

  try {
    // create a pseudo npm package with a dependency to the plugin referenced from the registry
    await fs.writeFile(path.join(dir.path, 'package.json'), JSON.stringify({
      name: body.id,
      type: 'module',
      dependencies: {
        [body.name]: '^' + body.version
      }
    }, null, 2))
    await exec('npm install --omit=dev', { cwd: dir.path })

    // move the plugin to the src directory (Stripping types is currently unsupported for files under node_modules)
    await fs.move(path.join(dir.path, 'node_modules', body.name), path.join(dir.path, 'src'), { overwrite: true })

    // generate an index.js file to export the main file
    const packageJson = (await fs.readJson(path.join(dir.path, 'src', 'package.json'))) || 'index.ts'
    await fs.writeFile(path.join(dir.path, 'index.ts'), `export * from './${path.join('src', packageJson)}'`)

    // TODO Validate the metadata file

    await fs.writeFile(path.join(dir.path, 'plugin.json'), JSON.stringify({
      id: body.id,
      name: packageJson.name,
      description: packageJson.description,
      version: packageJson.version
    }, null, 2))

    await fs.move(dir.path, pluginDir, { overwrite: true })
  } finally {
    try {
      await dir.cleanup()
    } catch (err) { } // ignore, directory was moved
  }

  res.send({
    id: body.id,
    name: body.name,
    description: body.description,
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
    const plugin: CatalogPlugin = await import(path.join(pluginsDir, dir, 'index.ts'))

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

// Return PluginData (if connected)
router.get('/:id', async (req, res) => {
  const sessionState = await session.reqAuthenticated(req)
  assertAccountRole(sessionState, sessionState.account, ['contrib', 'admin'])
  try {
    const pluginDir = path.join(pluginsDir, req.params.id)
    const pluginInfo = await fs.readJson(path.join(pluginDir, 'plugin.json'))
    const plugin: CatalogPlugin = await import(path.join(pluginDir, 'index.ts'))

    res.send({
      id: pluginInfo.id,
      name: pluginInfo.name,
      description: pluginInfo.description,
      version: pluginInfo.version,
      configSchema: plugin.configSchema,
      metadata: plugin.metadata
    } as Plugin)
  } catch (e: any) {
    if (e.code === 'ENOENT') throw httpError(404, 'Plugin not found')
    else throw httpError(500, 'Internal server error')
  }
})

router.delete('/:id', async (req, res) => {
  await session.reqAdminMode(req)
  await fs.remove(path.join(pluginsDir, req.params.id))
  res.status(204).send()
})
