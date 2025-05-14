import type { Import } from '#api/types'
import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog/index.js'

import Debug from 'debug'
import { existsSync } from 'fs'
import resolvePath from 'resolve-path'
import path from 'path'
import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'
import { startObserver, stopObserver, internalError } from '@data-fair/lib-node/observer.js'
import upgradeScripts from '@data-fair/lib-node/upgrade-scripts.js'
import { execute } from './utils/import.ts'
import config from '#config'
import mongo from '#mongo'
import locks from '#locks'

const debug = Debug('worker')
const debugLoop = Debug('worker-loop')

/** Loop promises, resolved when worker is stopped */
let mainLoopPromise: Promise<void>
let stopped = false
const promisePool: (Promise<void> | null)[] = new Array(config.worker.concurrency).fill(null)

// Start the worker (start the mail loop and all dependencies)
export const start = async () => {
  if (!existsSync(config.dataDir)) throw new Error(`Data directory ${resolvePath(config.dataDir)} was not mounted`)

  await mongo.init()
  const db = mongo.db
  await locks.start(db)
  await upgradeScripts(db, locks, config.upgradeRoot)
  await wsEmitter.init(db)
  if (config.observer.active) await startObserver(config.observer.port)

  mainLoopPromise = mainLoop()
}

// Stop and wait for all workers to finish their current task
export const stop = async () => {
  stopped = true
  await Promise.all(promisePool.filter(p => !!p))
  await mainLoopPromise
  await locks.stop()
  await mongo.close()
  if (config.observer.active) await stopObserver()
}

/**
 * This is the main loop of the worker
 * Check if they are any tasks to process and process them
 * If the worker is inactive, wait for a longer delay
 */
const mainLoop = async () => {
  let lastActivity = new Date().getTime()
  // eslint-disable-next-line no-unmodified-loop-condition
  while (!stopped) {
    const now = new Date().getTime()

    // Timeout between each loop
    if ((now - lastActivity) > config.worker.inactivityDelay) { // inactive polling interval
      debugLoop('the worker is inactive wait extra delay', config.worker.inactiveInterval)
      await new Promise(resolve => setTimeout(resolve, config.worker.inactiveInterval))
    } else { // base polling interval
      await new Promise(resolve => setTimeout(resolve, config.worker.interval))
    }

    // wait for an available spot in the promise pool
    // the loop is stopped as long as the pool is full
    if (!promisePool.includes(null)) {
      debugLoop('pool is full, wait for a free spot')
      await Promise.any(promisePool)
    }

    // Again check if the worker is stopped
    // after timeout between each loop and waiting for a free slot
    if (stopped) continue

    const freeSlot = promisePool.findIndex(p => !p)
    debugLoop('index of a free slot', freeSlot)

    const importD = await acquireNext()
    if (!importD) continue // No import to process

    debugLoop(`import ${importD.remoteResourceId ? `remote resource ${importD.remoteResourceId} from ` : ''} remote dataset ${importD.remoteDatasetId} from catalog ${importD.catalogId}`)
    lastActivity = new Date().getTime()

    const iterPromise = iter(importD)
    promisePool[freeSlot] = iterPromise
    // empty the slot after the promise is finished
    // do not catch failure, they should trigger a restart of the loop
    iterPromise.then(promisePool[freeSlot] = null)
  }
}

/**
 * Manage an import
 */
async function iter (importD: Import) {
  const catalog = await mongo.catalogs.findOne({ _id: importD.catalogId })

  if (!catalog) {
    await mongo.imports.deleteOne({ _id: importD._id })
    return internalError('worker-missing-catalog', 'found an import without associated catalog, weird')
  }
  debug(`Catalog ${catalog.title}`)

  // TODO: Use getPlugin function
  const plugin: CatalogPlugin = (await import(path.resolve(config.dataDir, 'plugins', catalog.plugin, 'index.ts'))).default
  if (!plugin) {
    await mongo.imports.deleteOne({ _id: importD._id })
    return internalError('worker-missing-plugin', 'found an import without associated plugin, weird')
  }

  try {
    await execute(catalog, plugin, importD)
  } catch (e) {
    debug('Error during import', e)
    await mongo.imports.updateOne({ _id: importD._id }, { $set: { status: 'error', error: e } })
    return
  }
  await locks.release(importD._id)
}

/**
 * Acquire the next import to process
 */
async function acquireNext (): Promise<Import | undefined> {
  const cursor = mongo.imports.aggregate<Import>([
    { $match: { status: 'pending' } }, { $sample: { size: 10 } }
  ])

  while (await cursor.hasNext()) {
    const importD = (await cursor.next())!
    const ack = await locks.acquire(importD._id, 'worker-loop-iter')
    debug('Try to acquire the lock for', importD._id)
    if (ack) {
      debug('Lock acquired for', importD._id)
      await mongo.imports.updateOne({ _id: importD._id }, { $set: { status: 'running' } })
      return importD
    }
  }
}
