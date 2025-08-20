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
const uploadDataset = async (log: ReturnType<typeof prepareLog>, catalog: Catalog, resource: Resource, imp: Import) => {
  const datasetId = imp.dataFairDataset?.id
  await log.step(`${datasetId ? 'Update existing dataset' : 'Create new dataset'}`)

  const formData = new FormData()
  if (!datasetId) await log.info('Creating new dataset')
  else await log.info('Updating existing dataset')

  const datasetResource: any = {}

  // Add metadata if creating new dataset or if metadata should be updated
  if (!datasetId || imp.shouldUpdateMetadata) {
    datasetResource.slug = resource.slug
    datasetResource.title = resource.title
    datasetResource.description = resource.description
    datasetResource.frequency = resource.frequency
    datasetResource.image = resource.image
    datasetResource.license = resource.license
    datasetResource.keywords = resource.keywords
    datasetResource.origin = resource.origin
    datasetResource.topics = resource.topics

    if (datasetId) delete datasetResource.slug // never updating slug when updating
  }

  // Add schema if creating new dataset or if schema should be updated
  if (!datasetId || imp.shouldUpdateSchema) {
    datasetResource.schema = resource.schema
  }
  formData.append('body', JSON.stringify(datasetResource))
  formData.append('dataset', fs.createReadStream(resource.filePath))

  const getLength = promisify(formData.getLength.bind(formData))
  const contentLength = await getLength()

  // Use existing dataset ID if provided, otherwise create a new dataset
  const url = datasetId ? `/api/v1/datasets/${datasetId}` : '/api/v1/datasets'
  const account = { ...catalog.owner }
  if (account.name) account.name = encodeURIComponent(account.name)
  if (account.departmentName) account.departmentName = encodeURIComponent(account.departmentName)

  const dataset = await axios({
    method: 'POST',
    url,
    baseURL: config.privateDataFairUrl,
    data: formData,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: {
      ...formData.getHeaders(),
      'content-length': contentLength.toString(),
      'x-apiKey': config.dataFairAPIKey,
      'x-account': JSON.stringify(account),
      'User-Agent': `@data-fair/catalogs (${catalog.plugin})`,
      host: config.host
    }
  })

  // Convert to a simple file dataset if it's a remote file
  if (datasetId && dataset.data.remoteFile) {
    await log.info(`Converting remote dataset ${dataset.data.id} to a simple file dataset`)
    await axios({
      method: 'PATCH',
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

  await log.info('Resource file uploaded successfully')

  const attachments = []
  if (resource.attachments && resource.attachments.length > 0 && (!datasetId || imp.shouldUpdateMetadata)) {
    await log.task('attachments', 'Uploading attachments to the dataset', resource.attachments.length)
    for (const [index, attachment] of resource.attachments.entries()) {
      if ('filePath' in attachment) {
        const attachmentFormData = new FormData()
        attachmentFormData.append('attachment', fs.createReadStream(attachment.filePath))
        const newAttachment = await axios({
          method: 'POST',
          url: `/api/v1/datasets/${dataset.data.id}/metadata-attachments`,
          baseURL: config.privateDataFairUrl,
          data: attachmentFormData,
          headers: {
            ...attachmentFormData.getHeaders(),
            'x-apiKey': config.dataFairAPIKey,
            'x-account': JSON.stringify(catalog.owner),
            'User-Agent': `@data-fair/catalogs (${catalog.plugin})`,
            host: config.host
          }
        })
        attachments.push({
          type: 'file',
          title: attachment.title,
          description: attachment.description,
          ...newAttachment.data
        })
      } else {
        attachments.push({
          type: 'url',
          title: attachment.title,
          description: attachment.description,
          url: attachment.url
        })
      }
      await log.progress('attachments', index + 1)
    }
    await axios({
      method: 'PATCH',
      url: `/api/v1/datasets/${dataset.data.id}`,
      baseURL: config.privateDataFairUrl,
      data: { attachments },
      headers: {
        'x-apiKey': config.dataFairAPIKey,
        'x-account': JSON.stringify(catalog.owner),
        'User-Agent': `@data-fair/catalogs (${catalog.plugin})`,
        host: config.host
      }
    })
  }

  await log.info(`Import ${datasetId ? 'updated' : 'created'} successfully - Dataset "${dataset.data.title}" (${dataset.data.id})`)
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
      importConfig: imp.config,
      resourceId: imp.remoteResource.id,
      tmpDir: tmpDir.path,
      log: logFunctions,
      update: {
        metadata: imp.shouldUpdateMetadata,
        schema: imp.shouldUpdateSchema
      }
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
      imp
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
