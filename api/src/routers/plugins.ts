import type { Plugin } from '#types'
import type { Request } from 'express'

import Debug from 'debug'
import { exec } from 'child_process'
import { Router } from 'express'
import { promisify } from 'util'
import fs from 'fs-extra'
import path from 'path'
import tmp from 'tmp-promise'
import multer from 'multer'
import { assertAccountRole, httpError, session } from '@data-fair/lib-express'
import { getPlugin } from '#utils/find.ts'
import mongo from '#mongo'
import config from '#config'

const execAsync = promisify(exec)
const debug = Debug('plugins')

const router = Router()
export default router

const pluginsDir = path.resolve(config.dataDir, 'plugins')
fs.ensureDirSync(pluginsDir)
const tmpDir = config.tmpDir || path.resolve(config.dataDir, 'tmp')
fs.ensureDirSync(tmpDir)

tmp.setGracefulCleanup()

/**
 * Multer configuration for handling file uploads.
 * It stores files directly in the temporary directory and only allows .tgz files.
 */
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, tmpDir)
    },
    filename: (req, file, cb) => {
      cb(null, `plugin-${Date.now()}-${file.originalname}`)
    }
  }),
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname) === '.tgz') cb(null, true)
    else cb(httpError(400, 'Only .tgz files are allowed'))
  },
  limits: { fileSize: 1 * 1024 * 1024 } // 1MB max
})

// Install a new plugin or update an existing one
router.post('/', upload.single('file'), async (req: Request & { file?: Express.Multer.File }, res) => {
  debug('Installing a new plugin', req.body, req.file)
  await session.reqAdminMode(req)

  const dir = await tmp.dir({ unsafeCleanup: true, tmpdir: tmpDir, prefix: 'plugin-install' })
  let id: string
  let tarballPath: string
  let pluginJson: {
    id: string,
    name: string,
    description: string,
    version: string
  }

  try {
    if (req.file) { // File upload mode - use the uploaded .tgz file
      tarballPath = req.file.path
    } else { // NPM mode - validate body and download from npm
      const { body } = (await import('../../doc/plugins/post-req/index.ts')).returnValid(req)

      // download the plugin package using npm pack
      const { stdout } = await execAsync(`npm pack ${body.name}@${body.version}`, { cwd: dir.path })
      tarballPath = path.join(dir.path, stdout.trim())
    }

    // extract the tarball
    await execAsync(`tar -xzf "${tarballPath}" -C "${dir.path}"`)
    const extractedPath = path.join(dir.path, 'package')

    // install dependencies of the plugin
    await execAsync('npm install', { cwd: extractedPath })

    // generate plugin.json from package.json
    const packageJson = await fs.readJson(path.join(extractedPath, 'package.json'))
    id = packageJson.name.replace('/', '-')
    pluginJson = {
      id,
      name: packageJson.name,
      description: packageJson.description,
      version: packageJson.version
    }
    await fs.writeFile(
      path.join(extractedPath, 'plugin.json'),
      JSON.stringify(pluginJson, null, 2)
    )

    // move the extracted plugin to the final destination
    await fs.move(extractedPath, path.join(pluginsDir, id), { overwrite: true })
    await dir.cleanup()
    if (req.file) await fs.remove(req.file.path)
  } catch (error: any) {
    await dir.cleanup()
    if (req.file) await fs.remove(req.file.path)
    throw httpError(400, `Failed to install plugin: ${error.message || error}`)
  }

  res.send({
    id,
    name: pluginJson.name,
    version: pluginJson.version
  })
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
    filtersSchema: plugin.filtersSchema,
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
