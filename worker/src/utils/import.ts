import type { Catalog, Import } from '#api/types'
import type { Account } from '@data-fair/lib-common-types/session/index.js'
import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog/index.js'

import { internalError } from '@data-fair/lib-node/observer.js'
import axios from '@data-fair/lib-node/axios.js'
import config from '#config'
import mongo from '#mongo'

export const execute = async (catalog: Catalog, plugin: CatalogPlugin, importD: Import) => {
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
      await mongo.imports.deleteOne({ _id: importD._id })
      return internalError('worker-missing-resource', 'found an import without associated resource, weird')
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

  if (importD.dataFairDatasetId) await updateDataFairDataset(resourceId, datasetPost, importD.dataFairDatasetId, catalog.owner)
  else await createDataFairDataset(resourceId, datasetPost, catalog.owner)
}

/**
 * Add properties to the dataset post or resource post
 * @param dataset - The dataset object
 * @param resourcePost - The resource post object
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
const createDataFairDataset = async (resourceId: string, datasetPost: any, account: Account) => {
  const createdDataset = await axios.post('/api/v1/datasets', datasetPost, {
    baseURL: config.dataFairUrl,
    headers: {
      'x-apiKey': config.dataFairAPIKey,
      'x-account': JSON.stringify(account)
    }
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
 * @param resourceId - The ID of the catalog resource or catalog dataset
 * @param datasetPost - The dataset data to be updated
 */
const updateDataFairDataset = async (resourceId: string, datasetPost: any, dataFairId: string, account: Account) => {
  try {
    delete datasetPost.isMetaOnly
    await axios.patch(`/api/v1/datasets/${dataFairId}`, datasetPost, {
      baseURL: config.dataFairUrl,
      headers: {
        'x-apiKey': config.dataFairAPIKey,
        'x-account': JSON.stringify(account)
      }
    })
    await mongo.imports.updateOne({
      _id: resourceId
    }, {
      $set: {
        status: 'done'
      }
    })
  } catch (error: any) {
    if (error.status === 404) await createDataFairDataset(resourceId, datasetPost, account)
    else throw error
  }
}
