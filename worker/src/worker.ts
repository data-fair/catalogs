import type { Publication, Import } from '#api/types'
import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog/index.js'

import Debug from 'debug'
import { existsSync } from 'fs'
import resolvePath from 'resolve-path'
import path from 'path'
import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'
import { startObserver, stopObserver, internalError } from '@data-fair/lib-node/observer.js'
import upgradeScripts from '@data-fair/lib-node/upgrade-scripts.js'
import { getNextImportDate } from '@data-fair/catalogs-shared/cron.ts'
import importTask from './utils/import.ts'
import publicationTask from './utils/publication.ts'
import config from '#config'
import mongo from '#mongo'
import locks from '#locks'

const debug = Debug('worker')
const debugLoop = Debug('worker-loop')

/** Loop promises, resolved when worker is stopped */
let mainLoopPromise: Promise<void>
let stopped = false
const promisePool: (Promise<void> | null)[] = new Array(config.worker.concurrency).fill(null)

const types = ['import', 'publication'] as const
type Task = Import | Publication

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

    let type, task
    for (const taskType of types) {
      if (stopped) break
      task = await acquireNext(taskType)
      type = taskType
      if (task) break
    }
    if (!task || !type) continue // No task to process

    lastActivity = new Date().getTime()

    const iterPromise = iter(task, type)
    promisePool[freeSlot] = iterPromise
    // empty the slot after the promise is finished
    // do not catch failure, they should trigger a restart of the loop
    iterPromise.then(promisePool[freeSlot] = null)
  }
}

/**
 * Execute a task
 */
async function iter (task: Task, type: typeof types[number]) {
  debug('Process', type, task._id)
  const collection = type === 'import' ? mongo.imports : mongo.publications

  const catalog = await mongo.catalogs.findOne({ _id: task.catalog.id })
  if (!catalog) {
    await collection.deleteOne({ _id: task._id })
    return internalError('worker-missing-catalog', 'found a task without associated catalog, weird')
  }
  debug(`Catalog ${catalog.title}`)

  // Invalidate the cache by adding a timestamp to the import
  const plugin: CatalogPlugin = (await import(path.resolve(config.dataDir, 'plugins', catalog.plugin, 'index.ts') + `?update=${Date.now()}`)).default
  if (!plugin) {
    await collection.deleteOne({ _id: task._id })
    return internalError('worker-missing-plugin', 'found a task without associated plugin, weird')
  }

  try {
    if (type === 'import') {
      await importTask.process(catalog, plugin, task as Import)
    } else {
      await publicationTask.process(catalog, plugin, task as Publication)
    }
  } catch (e: any) {
    debug('Error while process', type, task._id, e)
    await collection.updateOne({ _id: task._id }, { $set: { status: 'error', error: e?.message || e } })
  } finally {
    await locks.release(`${type}:${task._id}`)
  }
}

/**
 * Acquire the next task to process
 */
async function acquireNext (type: typeof types[number]): Promise<Task | undefined> {
  const collection = type === 'import' ? mongo.imports : mongo.publications
  // Check if there is a scheduled task to process
  if (type === 'import') scheduleImport()

  const cursor = collection.aggregate<Task>([
    { $match: { status: 'waiting' } }, { $sample: { size: 10 } }
  ])

  while (await cursor?.hasNext()) {
    const task = (await cursor!.next())!
    const ack = await locks.acquire(`${type}:${task._id}`, 'worker-loop-iter')
    if (!ack) continue
    return task
  }
}

async function scheduleImport () {
  const tasksToUpdate = await mongo.imports.find(
    { status: { $ne: 'waiting' }, nextImportDate: { $lte: new Date().toISOString() } }
  ).toArray()

  for (const task of tasksToUpdate) {
    await mongo.imports.updateOne(
      { _id: task._id },
      {
        $set: {
          status: 'waiting',
          nextImportDate: getNextImportDate(task.scheduling)
        }
      }
    )
  }
}
