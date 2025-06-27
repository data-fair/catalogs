import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog/index.js'
import type { Request } from 'express'

import { exec } from 'child_process'
import path from 'path'
import fs from 'fs-extra'
import { promisify } from 'util'
import semver from 'semver'
import tmp from 'tmp-promise'
import multer from 'multer'
import { httpError } from '@data-fair/lib-express'
import config from '#config'

const execAsync = promisify(exec)

const pluginsDir = path.resolve(config.dataDir, 'plugins')
fs.ensureDirSync(pluginsDir)
const tmpDir = config.tmpDir || path.resolve(config.dataDir, 'tmp')
fs.ensureDirSync(tmpDir)

tmp.setGracefulCleanup()

/**
 * Install a new plugin or update an existing one
 */
export const installPlugin = async (req: Request & { file?: Express.Multer.File }) => {
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
    id = packageJson.name.replace('/', '-') + '-' + semver.major(packageJson.version)
    pluginJson = {
      id,
      name: packageJson.name,
      description: packageJson.description,
      version: packageJson.version
    }

    // move the extracted plugin to the final destination :
    // 'pluginsDir/pluginId/pluginVersion
    const pluginDir = path.join(pluginsDir, id)
    await fs.remove(pluginDir) // Remove old version if exists
    await fs.move(extractedPath, path.join(pluginDir, packageJson.version))

    // Write metadata to 'pluginsDir/pluginId/plugin.json'
    await fs.writeFile(
      path.join(pluginDir, 'plugin.json'),
      JSON.stringify(pluginJson, null, 2)
    )

    await dir.cleanup() // Delete the temporary directory
    if (req.file) await fs.remove(req.file.path) // Delete the uploaded file if exists

    return {
      id,
      name: pluginJson.name,
      version: pluginJson.version
    }
  } catch (error: any) {
    await dir.cleanup() // Delete the temporary directory
    if (req.file) await fs.remove(req.file.path) // Delete the uploaded file if exists
    throw httpError(400, `Failed to install plugin: ${error.message || error}`)
  }
}

/**
 * Middleware to handle file uploads for plugins.
 * It stores files directly in the temporary directory and only allows .tgz files.
 */
export const getTarball = multer({
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
}).single('file')

/**
 * Get/import a plugin by its ID.
 * It reads the plugin.json file and imports the plugin's main file.
 * Invalidate the cache if a new version is installed.
 * Throws an error if the plugin is not found or if there is an issue with the plugin.
 */
export const getPlugin = async (pluginId: string): Promise<CatalogPlugin> => {
  try {
    if (!pluginId) throw httpError(400, 'Plugin ID is required')

    const pluginJsonPath = path.join(pluginsDir, pluginId, 'plugin.json')
    const pluginJson = JSON.parse(fs.readFileSync(pluginJsonPath, 'utf8'))
    const pluginPath = path.join(pluginsDir, pluginId, pluginJson.version, 'index.ts')
    if (!pluginPath) throw httpError(404, `No version found in plugin ${pluginId}`)
    return (await import(pluginPath)).default
  } catch (e: any) {
    if (e.message.includes('Cannot find module')) throw httpError(404, `Plugin ${pluginId} not found (or error in plugin : ${e.message})`)
    throw e // Rethrow other errors
  }
}
