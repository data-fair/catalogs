import type { Catalog, Import } from '#api/types'
import type { CatalogPlugin, Resource } from '@data-fair/types-catalogs'

import { promisify } from 'util'
import fs from 'fs-extra'
import path from 'path'
import FormData from 'form-data'
import tmp from 'tmp-promise'
import { emit as wsEmit } from '@data-fair/lib-node/ws-emitter.js'
import { internalError } from '@data-fair/lib-node/observer.js'
import eventsQueue from '@data-fair/lib-node/events-queue.js'
import { decipherSecrets } from '@data-fair/catalogs-shared/cipher.ts'
import axios from '@data-fair/lib-node/axios.js'
import prepareLog from './logs.ts'
import config from '#config'
import mongo from '#mongo'

const baseTmpDir = config.tmpDir || path.join(config.dataDir, 'tmp')
fs.ensureDirSync(baseTmpDir)
tmp.setGracefulCleanup()

/**
 * Handle errors during import operations, logging them and updating the import status.
 * @param type - The type of import operation ('upload' or 'download').
 * @param importId - The ID of the import operation.
 * @param catalogId - The ID of the catalog associated with the import.
 * @param resource - The resource being imported.
 * @param err - The error that occurred.
 * @param errorLog - A function to log the error.
 */
const handleImportError = async (type: 'upload' | 'download', imp: Import, err: any, errorLog: ReturnType<typeof prepareLog>['error']) => {
  await errorLog(`Failed to ${type} resource file: ` + (err instanceof Error ? err.message : String(err)), err)
  await mongo.imports.updateOne({ _id: imp._id }, { $set: { status: 'error', finishedAt: new Date().toISOString() } })
  await wsEmit(`import/${imp._id}`, { status: 'error', finishedAt: new Date().toISOString() })
  internalError(`worker-${type}-failed`, `Failed to ${type} resource file`, imp)
  eventsQueue.pushEvent({
    title: `L'import de la resource ${imp.remoteResource.title} à échoué`,
    topic: { key: `catalogs:import-error:${imp._id}` },
    sender: imp.owner,
    resource: {
      type: 'catalog',
      id: imp.catalog.id,
      title: 'Catalogue associé : ' + imp.catalog.title
    },
    originator: {
      internalProcess: {
        id: 'catalogs-worker',
        name: 'Catalogs Worker'
      }
    }
  })
}

/**
 * Create a Data Fair dataset and upload the resource file to it.
 * If datasetId is provided, update the existing dataset instead of creating a new one.
 * @param log - The logging functions for the import operation.
 * @param catalog - The catalog to which the dataset belongs.
 * @param resource - The resource to upload.
 * @param datasetId - Optional ID of an existing dataset to update.
 * @returns The dataset ID and title.
 * @throws Will throw an error if the upload fails.
 */
const uploadDataset = async (log: ReturnType<typeof prepareLog>, catalog: Catalog, resource: Resource, datasetId?: string) => {
  await log.step('Upload resource to Data Fair')

  const formData = new FormData()
  if (!datasetId) {
    await log.info('Creating new dataset')
    const datasetResource = {
      title: resource.title,
      description: resource.description,
      frequency: resource.frequency,
      image: resource.image,
      license: resource.license,
      keywords: resource.keywords,
      origin: resource.origin,
      schema: resource.schema,
      topics: resource.topics
    }
    formData.append('body', JSON.stringify(datasetResource))
  } else {
    await log.info(`Updating existing Data Fair dataset ${datasetId}`)
  }
  formData.append('dataset', fs.createReadStream(resource.filePath))

  const getLength = promisify(formData.getLength.bind(formData))
  const contentLength = await getLength()

  // Use existing dataset ID if provided, otherwise create a new dataset
  const url = datasetId ? `/api/v1/datasets/${datasetId}` : '/api/v1/datasets'

  const dataset = await axios({
    method: 'post',
    url,
    baseURL: config.privateDataFairUrl,
    data: formData,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: {
      ...formData.getHeaders(),
      'content-length': contentLength.toString(),
      'x-apiKey': config.dataFairAPIKey,
      'x-account': JSON.stringify(catalog.owner),
      'User-Agent': `@data-fair/catalogs (${catalog.plugin})`,
      host: config.host
    }
  })

  // Convert to a simple file dataset if it's a remote file
  if (datasetId && dataset.data.remoteFile) {
    await axios({
      method: 'patch',
      url: `/api/v1/datasets/${dataset.data.id}`,
      baseURL: config.privateDataFairUrl,
      data: { remoteFile: null },
      headers: {
        'x-apiKey': config.dataFairAPIKey,
        'x-account': JSON.stringify(catalog.owner),
        'User-Agent': `@data-fair/catalogs (${catalog.plugin})`,
        host: config.host
      }
    })
  }

  await log.info(`Resource file uploaded successfully to ${dataset.data.title} (${dataset.data.id})`)
  return { id: dataset.data.id, title: dataset.data.title }
}

export const process = async (catalog: Catalog, plugin: CatalogPlugin, imp: Import) => {
  const tmpDir = await tmp.dir({ unsafeCleanup: true, tmpdir: baseTmpDir, prefix: `catalog-import-${catalog._id}-${imp._id}` })

  let resource: Resource
  const logFunctions = prepareLog(imp, 'import')
  try {
    resource = await plugin.getResource({
      catalogConfig: catalog.config,
      secrets: decipherSecrets(catalog.secrets, config.cipherPassword),
      importConfig: imp.config || {},
      resourceId: imp.remoteResource.id,
      tmpDir: tmpDir.path,
      log: logFunctions
    })
  } catch (err) {
    return await handleImportError('download', imp, err, logFunctions.error)
  }

  // Create datafair dataset and upload the file
  // If the import already has a dataFairDataset ID, update the existing dataset
  let dataset: { id: string; title: string }
  try {
    dataset = await uploadDataset(
      logFunctions,
      catalog,
      resource,
      imp.dataFairDataset?.id
    )
  } catch (err) {
    return await handleImportError('upload', imp, err, logFunctions.error)
  }

  // Update import document
  const newValues = {
    dataFairDataset: {
      id: dataset.id,
      title: dataset.title,
    },
    remoteResource: {
      id: imp.remoteResource.id,
      title: resource.title,
      origin: resource.origin
    },
    status: 'done' as const,
    finishedAt: new Date().toISOString(),
    lastImportDate: new Date().toISOString()
  }

  await mongo.imports.updateOne({ _id: imp._id }, { $set: newValues })
  await wsEmit(`import/${imp._id}`, newValues)

  await tmpDir.cleanup() // Clean up temporary directory
}

export default { process }
