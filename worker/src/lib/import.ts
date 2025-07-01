import type { Catalog, Import } from '#api/types'
import type { CatalogPlugin, Resource } from '@data-fair/types-catalogs'

import { emit as wsEmit } from '@data-fair/lib-node/ws-emitter.js'
import { internalError } from '@data-fair/lib-node/observer.js'
import { decipherSecrets } from '@data-fair/catalogs-shared/cipher.ts'
import axios from '@data-fair/lib-node/axios.js'
import { promisify } from 'util'
import fs from 'fs-extra'
import path from 'path'
import FormData from 'form-data'
import tmp from 'tmp-promise'
import config from '#config'
import mongo from '#mongo'

const baseTmpDir = config.tmpDir || path.join(config.dataDir, 'tmp')
fs.ensureDirSync(baseTmpDir)
tmp.setGracefulCleanup()

/**
 * Create a Data Fair dataset and upload the resource file to it.
 * If datasetId is provided, update the existing dataset instead of creating a new one.
 */
const createAndUploadDataset = async (
  catalog: Catalog,
  resource: Resource,
  datasetId?: string
): Promise<any> => {
  const formData = new FormData()
  if (!datasetId) {
    const datasetResource = {
      title: resource.title,
      description: resource.description,
      frequency: resource.frequency,
      image: resource.image,
      license: resource.license,
      keywords: resource.keywords,
      origin: resource.origin,
      schema: resource.schema
    }
    formData.append('body', JSON.stringify(datasetResource))
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

  return dataset.data
}

export const process = async (catalog: Catalog, plugin: CatalogPlugin, imp: Import) => {
  const tmpDir = await tmp.dir({ unsafeCleanup: true, tmpdir: baseTmpDir, prefix: `catalog-import-${catalog._id}-${imp._id}` })

  let resource: Resource | undefined
  try {
    resource = await plugin.getResource({
      catalogConfig: catalog.config,
      secrets: decipherSecrets(catalog.secrets, config.cipherPassword),
      importConfig: imp.config || {},
      resourceId: imp.remoteResource.id,
      tmpDir: tmpDir.path,
    })
  } catch (err) {
    await mongo.imports.updateOne({ _id: imp._id }, {
      $set: { status: 'error', error: 'Failed to download resource file' }
    })
    await wsEmit(`import/${imp._id}`, {
      status: 'error',
      error: 'Failed to download resource file'
    })
    internalError('worker-download-failed', 'Failed to download resource file', {
      catalogId: catalog._id,
      resource,
      error: err instanceof Error ? err.message : String(err)
    })
    throw err
  }
  if (!resource) {
    internalError('worker-download-failed', 'Failed to download resource file without error')
    throw new Error('Failed to download resource file without error')
  }

  // Create datafair dataset and upload the file
  // If the import already has a dataFairDataset ID, update the existing dataset
  const existingDatasetId = imp.dataFairDataset?.id
  const dataset = await createAndUploadDataset(
    catalog,
    resource,
    existingDatasetId
  )

  // Update import document
  const newValues = {
    dataFairDataset: {
      id: dataset.id,
      title: dataset.title,
    },
    status: 'done' as const,
    lastImportDate: new Date().toISOString()
  }

  await mongo.imports.updateOne({ _id: imp._id }, {
    $set: newValues,
    $unset: { error: 1 }
  })
  await wsEmit(`import/${imp._id}`, { ...newValues, error: undefined })

  await tmpDir.cleanup() // Clean up temporary directory
}

export default { process }
