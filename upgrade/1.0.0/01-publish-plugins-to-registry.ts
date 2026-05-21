import type { UpgradeScript } from '@data-fair/lib-node/upgrade-scripts.js'
import { existsSync, createReadStream, createWriteStream } from 'node:fs'
import { readdir, readFile, lstat, readlink, mkdtemp, rm } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { arch as hostArch } from 'node:process'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import * as tarStream from 'tar-stream'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { importPluginModule } from '@data-fair/catalogs-shared/plugin-load.ts'
import config from '../../worker/src/config.ts'

type PluginJson = { id: string, name: string, version: string, description?: string }

/**
 * Repack a directory into a gzipped tarball at `tarballPath`, prefixing every
 * entry with `package/` (the npm tarball convention the registry expects).
 * node_modules is included so registry consumers get a runnable bundle;
 * symlinks are preserved as symlinks.
 */
async function packPluginDir (pluginDir: string, tarballPath: string): Promise<void> {
  const pack = tarStream.pack()
  const writeDone = pipeline(pack, createGzip(), createWriteStream(tarballPath))

  const addEntry = (header: tarStream.Headers, body?: string): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      const cb = (err?: Error | null) => err ? reject(err) : resolve()
      if (body !== undefined) { pack.entry(header, body, cb); return }
      // Non-file entries (symlinks) carry no body — the linkname is in the header.
      if (header.type && header.type !== 'file') { pack.entry(header, cb).end(); return }
      const entry = pack.entry(header, cb)
      entry.on('error', reject)
      createReadStream(path.join(pluginDir, header.name.replace(/^package\//, '')))
        .on('error', reject)
        .pipe(entry)
    })

  const walk = async (relPath: string): Promise<void> => {
    const fullPath = path.join(pluginDir, relPath)
    const st = await lstat(fullPath)
    const tarName = `package/${relPath}`
    if (st.isDirectory()) {
      for (const child of await readdir(fullPath)) await walk(`${relPath}/${child}`)
    } else if (st.isFile()) {
      await addEntry({ name: tarName, size: st.size, mode: st.mode, mtime: st.mtime, type: 'file' })
    } else if (st.isSymbolicLink()) {
      await addEntry({ name: tarName, type: 'symlink', linkname: await readlink(fullPath), mode: st.mode, mtime: st.mtime })
    }
    // sockets/devices/etc — not relevant for plugin tarballs, skip silently
  }

  for (const child of await readdir(pluginDir)) await walk(child)
  pack.finalize()
  await writeDone
}

export default {
  description: 'v1.0.0 — publish legacy on-disk catalog plugins into the registry',
  async exec (_db, debug) {
    if (!config.dataDir) {
      debug('dataDir unset — nothing to migrate')
      return
    }
    const pluginsDir = path.join(config.dataDir, 'plugins')
    if (!existsSync(pluginsDir)) {
      debug('legacy plugins volume absent — nothing to migrate')
      return
    }

    const ax = axiosBuilder({
      baseURL: config.privateRegistryUrl.replace(/\/$/, ''),
      headers: { 'x-secret-key': config.secretKeys.registry }
    })

    const entries = await readdir(pluginsDir, { withFileTypes: true })
    const failures: { dir: string, error: string }[] = []

    for (const entry of entries) {
      const dir = entry.name
      if (!entry.isDirectory()) continue
      try {
        const pluginJsonPath = path.join(pluginsDir, dir, 'plugin.json')
        if (!existsSync(pluginJsonPath)) {
          debug(`${dir}: no plugin.json, skipping`)
          continue
        }
        const pluginJson = JSON.parse(await readFile(pluginJsonPath, 'utf8')) as PluginJson
        if (!pluginJson.name || !pluginJson.version) {
          debug(`${dir}: malformed plugin.json, skipping`)
          continue
        }
        // The artefact id is the legacy plugin directory name — exactly what
        // catalog.plugin already references, so catalogs need no data migration.
        const artefactId = dir
        const versionDir = path.join(pluginsDir, dir, pluginJson.version)
        if (!existsSync(versionDir)) {
          debug(`${dir}: version directory ${pluginJson.version} missing, skipping`)
          continue
        }

        // Probe: skip if this arch slot is already published (idempotent).
        const probe = await ax.get(`/api/v1/artefacts/${encodeURIComponent(artefactId)}`, {
          validateStatus: s => s === 200 || s === 404
        })
        if (probe.status === 200 && probe.data?.tarballs?.[hostArch]) {
          debug(`${dir}: already published for ${hostArch}, skipping`)
          continue
        }

        const stagingDir = await mkdtemp(path.join(os.tmpdir(), 'catalogs-migrate-'))
        const tarballPath = path.join(stagingDir, `${dir}.tgz`)
        try {
          await packPluginDir(versionDir, tarballPath)

          const form = new FormData()
          form.append('architecture', hostArch)
          form.append('category', 'catalog')
          form.append('file', new Blob([await readFile(tarballPath)]), 'package.tgz')
          debug(`${dir}: uploading ${pluginJson.name}@${pluginJson.version} as ${artefactId} (${hostArch})`)
          await ax.post(`/api/v1/artefacts/npm/${encodeURIComponent(artefactId)}`, form, {
            validateStatus: s => s === 201
          })
          // Preserve today's "every account-admin can use every plugin".
          await ax.patch(`/api/v1/artefacts/${encodeURIComponent(artefactId)}`, { public: true })
          debug(`${dir}: published`)

          // Best-effort: publish the in-tarball thumbnail to the registry so
          // the picker shows an icon for migrated plugins.
          try {
            const mod = await importPluginModule<{ default: { metadata?: { thumbnailPath?: string } } }>(versionDir)
            const thumbnailPath = mod.default?.metadata?.thumbnailPath
            if (thumbnailPath) {
              const thumbAbs = path.join(versionDir, thumbnailPath)
              if (existsSync(thumbAbs)) {
                const tform = new FormData()
                tform.append('file', new Blob([await readFile(thumbAbs)]), path.basename(thumbnailPath))
                await ax.post(`/api/v1/artefacts/${encodeURIComponent(artefactId)}/thumbnail`, tform, {
                  validateStatus: s => s === 201
                })
                debug(`${dir}: thumbnail uploaded`)
              }
            }
          } catch (err: any) {
            debug(`${dir}: thumbnail upload skipped (${err?.message ?? err})`)
          }
        } finally {
          await rm(stagingDir, { recursive: true, force: true })
        }
      } catch (err: any) {
        const msg = err?.response
          ? `${err.response.status}: ${JSON.stringify(err.response.data)}`
          : (err?.message ?? String(err))
        debug(`${dir}: migration failed (${msg}) — left on volume for manual reconciliation`)
        failures.push({ dir, error: msg })
      }
    }

    if (failures.length) {
      debug(`${failures.length} plugin(s) failed migration: ${failures.map(f => f.dir).join(', ')}. Reconcile manually.`)
    }
  }
} as UpgradeScript
