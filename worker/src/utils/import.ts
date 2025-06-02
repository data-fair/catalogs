import type { Catalog, Import } from '#api/types'
import type { CatalogPlugin, Resource } from '@data-fair/lib-common-types/catalog/index.js'

import { internalError } from '@data-fair/lib-node/observer.js'
import axios from '@data-fair/lib-node/axios.js'
import fs from 'fs-extra'
import path from 'path'
import { promisify } from 'util'
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
  filePath: string,
  datasetId?: string
): Promise<any> => {
  const formData = new FormData()
  formData.append('title', resource.title)
  formData.append('description', resource.description || '')
  formData.append('file', fs.createReadStream(filePath))

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

  return dataset.data
}

export const process = async (catalog: Catalog, plugin: CatalogPlugin, imp: Import) => {
  // Get the resource from the catalog
  const resource = await plugin.getResource(catalog.config, imp.remoteResource.id)
  if (!resource) {
    await mongo.imports.deleteOne({ _id: imp._id })
    return internalError('worker-missing-resource', 'found an import without associated resource, weird')
  }

  const tmpDir = await tmp.dir({ unsafeCleanup: true, tmpdir: baseTmpDir, prefix: `catalog-import-${catalog._id}-${imp._id}` })

  let filePath: string | undefined
  try {
    filePath = await plugin.downloadResource(catalog.config, resource.id, tmpDir.path)
  } catch (err) {
    await mongo.imports.updateOne({ _id: imp._id }, {
      $set: { status: 'error', error: 'Failed to download resource file' }
    })
    return internalError('worker-download-failed', 'Failed to download resource file', {
      catalog,
      resource,
      error: err instanceof Error ? err.message : String(err)
    })
  }
  if (!filePath) {
    return internalError('worker-download-failed', 'Failed to download resource file without error')
  }

  // Create datafair dataset and upload the file
  // If the import already has a dataFairDataset ID, update the existing dataset
  const existingDatasetId = imp.dataFairDataset?.id
  const dataset = await createAndUploadDataset(
    catalog,
    resource,
    filePath,
    existingDatasetId
  )

  // Update import document
  await mongo.imports.updateOne({ _id: imp._id }, {
    $set: {
      dataFairDataset: {
        id: dataset.id,
        title: dataset.title,
      },
      status: 'done',
      lastImportDate: new Date().toISOString()
    }
  })

  await tmpDir.cleanup() // Clean up temporary directory
}

export default { process }
