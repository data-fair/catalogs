import type { Import } from '#api/types'
import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog/index.js'

import Debug from 'debug'
import { existsSync } from 'fs'
import resolvePath from 'resolve-path'

import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'
import { startObserver, stopObserver, internalError } from '@data-fair/lib-node/observer.js'
import upgradeScripts from '@data-fair/lib-node/upgrade-scripts.js'
import axios from '@data-fair/lib-node/axios.js'
import config from '#config'
import mongo from '#mongo'
import locks from '#locks'
import path from 'path'

const debug = Debug('worker')
const debugLoop = Debug('worker-loop')

let stopped = false
const promisePool: [Promise<void> | null] = [null]

// Loop promises, resolved when stopped
let mainLoopPromise: Promise<void>

// Start the worker (start the mail loop and all dependencies)
export const start = async () => {
  if (!existsSync(config.dataDir) && process.env.NODE_ENV === 'production') {
    throw new Error(`Data directory ${resolvePath(config.dataDir)} was not mounted`)
  }
  await mongo.init()
  const db = mongo.db
  await locks.start(db)
  await upgradeScripts(db, locks, config.upgradeRoot)
  await wsEmitter.init(db)
  if (config.observer.active) await startObserver(config.observer.port)

  // initialize empty promise pool
  for (let i = 0; i < config.worker.concurrency; i++) {
    promisePool[i] = null
  }

  const lastActivity = new Date().getTime()
  mainLoop(lastActivity)
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
 * Main loop
 * Check for available runs to process and start a task for each run
 * If the worker is inactive, wait for a longer delay
 * @param db
 * @param lastActivity the timestamp of the last activity of the worker
 */
function mainLoop (lastActivity: number) {
  // eslint-disable-next-line no-async-promise-executor
  mainLoopPromise = new Promise(async (resolve) => {
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
      if (stopped) continue // Stop loop if the worker is stopped

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
    resolve()
  })
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

  // TODO: Use getPlugin function
  const plugin: CatalogPlugin = (await import(path.resolve(config.dataDir, 'plugins', catalog.plugin, 'index.ts'))).default
  if (!plugin) {
    await mongo.imports.deleteOne({ _id: importD._id })
    return internalError('worker-missing-plugin', 'found an import without associated plugin, weird')
  }

  debug(`Import in progress from catalog ${catalog.title}`)
  let datasetPost: Record<string, any>
  let resourceId: string
  const remoteDataset = await plugin.getDataset(catalog.config, importD.remoteDatasetId)
  if (!remoteDataset) {
    await mongo.imports.deleteOne({ _id: importD._id })
    return internalError('worker-missing-dataset', 'found an import without associated dataset, weird')
  }

  if (importD.remoteResourceId) { // Case when creating dataset from a specific resource
    resourceId = importD.remoteResourceId
    const remoteResource = remoteDataset.resources?.find(r => r.id === importD.remoteResourceId)
    if (!remoteResource) {
      internalError('worker-missing-resource', 'found an import without associated resource, weird')
      await mongo.imports.deleteOne({ _id: importD._id })
      return
    }

    datasetPost = {
      title: remoteResource.title,
      remoteFile: {
        url: remoteResource.url,
      }
    }
    if (remoteResource.mimeType) datasetPost.remoteFile.mimeType = remoteResource.mimeType
    if (remoteResource.fileName) datasetPost.remoteFile.name = remoteResource.fileName
    if (remoteResource.size) datasetPost.remoteFile.size = remoteResource.size
  } else { // Case when creating a meta-only dataset with all resources as attachments
    resourceId = importD.remoteDatasetId
    datasetPost = {
      title: remoteDataset.title,
      isMetaOnly: true
    }
    const attachments = remoteDataset.resources?.map((res) => {
      return {
        title: res.title,
        type: 'url',
        url: res.url
      }
    })
    if ((attachments?.length ?? 0) > 0) datasetPost.attachments = attachments
  }
  addProps(remoteDataset, datasetPost) // Add common properties

  if (importD.dataFairDatasetId) await updateDataFairDataset(resourceId, datasetPost, importD.dataFairDatasetId)
  else await createDataFairDataset(resourceId, datasetPost)
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
    debug('acquire lock for run ?', importD._id, ack)
    if (ack) {
      await mongo.imports.updateOne({ _id: importD._id }, { $set: { status: 'running' } })
      return importD
    }
  }
}

/**
 * Add properties to the dataset post or resource post
 * @param {any} dataset - The dataset object
 * @param {any} resourcePost - The resource post object
 */
const addProps = (dataset: any, resourcePost: any) => {
  if (dataset.description) resourcePost.description = dataset.description
  if (dataset.origin) resourcePost.origin = dataset.origin
  if (dataset.keywords) resourcePost.keywords = dataset.keywords
  if (dataset.image) resourcePost.image = dataset.image
  if (dataset.frequency) resourcePost.frequency = dataset.frequency
  if (dataset.license) resourcePost.license = dataset.license
}

/**
 * Create a dataset in Data-Fair
 * @param resourceId - The ID of the catalog resource or catalog dataset
 * @param datasetPost - The dataset data to be created
 */
const createDataFairDataset = async (resourceId: string, datasetPost: any) => {
  const createdDataset = await axios.post('/data-fair/api/v1/datasets', datasetPost, {
    baseURL: config.dataFairUrl
  })

  await mongo.imports.updateOne({ _id: resourceId }, {
    $set: {
      dataFairDatasetId: createdDataset.data._id,
      status: 'done'
    }
  })
}

/**
 * Update a dataset in Data-Fair or create it if it doesn't exist
 * @param {string} resourceId - The ID of the catalog resource or catalog dataset
 * @param {any} datasetPost - The dataset data to be updated
 */
const updateDataFairDataset = async (resourceId: string, datasetPost: any, dataFairId: string) => {
  try {
    delete datasetPost.isMetaOnly
    await axios.patch(`/data-fair/api/v1/datasets/${dataFairId}`, datasetPost, {
      baseURL: config.dataFairUrl
    })
    await mongo.imports.updateOne({
      _id: resourceId
    }, {
      $set: {
        status: 'done'
      }
    })
  } catch (error: any) {
    if (error.status === 404) await createDataFairDataset(resourceId, datasetPost)
    else throw error
  }
}
