import type { Catalog, Publication } from '#api/types'
import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog/index.js'
import type { AxiosRequestConfig } from 'axios'

import { internalError } from '@data-fair/lib-node/observer.js'
import axios from '@data-fair/lib-node/axios.js'
import config from '#config'
import mongo from '#mongo'

const getAxiosOptions = (catalog: Catalog): AxiosRequestConfig => {
  return {
    baseURL: config.privateDataFairUrl,
    headers: {
      'x-apiKey': config.dataFairAPIKey,
      'x-account': JSON.stringify(catalog.owner),
      'User-Agent': `@data-fair/catalogs (${catalog.plugin})`,
      host: config.host,
    }
  }
}

export const process = async (catalog: Catalog, plugin: CatalogPlugin, pub: Publication) => {
  // 1. Get the Data Fair Dataset
  const dataFairDataset = (await axios.get(`/api/v1/dataset/${pub.dataFairDataset.id}`, getAxiosOptions(catalog))).data
  if (!dataFairDataset) {
    await mongo.publications.deleteOne({ _id: pub._id })
    return internalError('worker-missing-dataset', 'found a publication without associated dataset, weird')
  }

  // 2. Check permissions
  if (
    catalog.owner.type !== dataFairDataset.owner.type ||
    catalog.owner.id !== dataFairDataset.owner.id ||
    catalog.owner.department !== pub.owner.department
  ) {
    const errorMsg = 'You do not have permission to publish this dataset in this catalog because the owner of the dataset is different from the owner of the catalog'
    await mongo.publications.updateOne({ _id: pub._id }, { $set: { status: 'error', error: errorMsg } })
    return internalError('worker-missing-permissions', errorMsg)
  }

  // 3. Publish the dataset
  if (!plugin.metadata.capabilities.includes('publishDatasets')) {
    await mongo.publications.deleteOne({ _id: pub._id })
    return internalError('worker-missing-capabilities', 'found a publication without the capability to publish datasets, weird')
  }
  const publicationRes = await plugin.publishDataset(catalog.config, dataFairDataset, pub)
  const validPublication = (await import('#api/types/publication/index.ts')).returnValid(publicationRes)

  // 4. Update the export status
  await mongo.publications.updateOne({ _id: pub._id }, { $set: validPublication })
}

export default { process }
