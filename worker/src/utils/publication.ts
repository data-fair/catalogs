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
  if (pub.action === 'delete') return await deletePublication(catalog, plugin, pub)

  // 1. Get the Data Fair Dataset
  const dataFairDataset = (await axios.get(`/api/v1/datasets/${pub.dataFairDataset.id}`, getAxiosOptions(catalog))).data
  if (!dataFairDataset) {
    await mongo.publications.deleteOne({ _id: pub._id })
    return internalError('worker-missing-dataset', 'found a publication without associated dataset, weird')
  }

  // 2. Check permissions
  // If the catalog has a department, check if the dataset is owned by the same department
  if (
    catalog.owner.type !== dataFairDataset.owner.type ||
    catalog.owner.id !== dataFairDataset.owner.id ||
    (catalog.owner.department && catalog.owner.department !== dataFairDataset.owner.department)
  ) {
    const errorMsg = 'You do not have permission to publish this dataset in this catalog'
    await mongo.publications.updateOne({ _id: pub._id }, { $set: { status: 'error', error: errorMsg } })
    return internalError('worker-missing-permissions', errorMsg)
  }

  // Check if the plugin has the capability to publish (and delete) datasets
  if (!plugin.metadata.capabilities.includes('publishDataset')) {
    await mongo.publications.deleteOne({ _id: pub._id })
    return internalError('worker-missing-capabilities', 'found a publication without the capability to publish datasets, weird')
  }

  await publish(catalog, plugin, pub, dataFairDataset)
}

const publish = async (catalog: Catalog, plugin: CatalogPlugin, pub: Publication, dataFairDataset: Record<string, any>) => {
  // 3. Publish the dataset
  const publicationRes = await plugin.publishDataset({
    catalogConfig: catalog.config,
    dataset: dataFairDataset,
    publication: {
      remoteDataset: pub.remoteDataset,
      remoteResource: pub.remoteResource,
      isResource: pub.action === 'addAsResource'
    },
    publicationSite: pub.publicationSite,
  })

  // 4. Update the publication status
  pub.dataFairDataset.title = dataFairDataset.title
  Object.assign(pub, {
    remoteResource: publicationRes.remoteResource,
    remoteDataset: publicationRes.remoteDataset,
  })
  pub.status = 'done'
  pub.lastPublicationDate = new Date().toISOString()
  delete pub.error
  const validPublication = (await import('../../../api/types/publication/index.ts')).returnValid(pub)

  await mongo.publications.updateOne(
    { _id: pub._id },
    {
      $set: validPublication,
      $unset: { error: '' }
    })
}

const deletePublication = async (catalog: Catalog, plugin: CatalogPlugin, pub: Publication) => {
  if (!pub.remoteDataset) {
    internalError('worker-missing-remote-data', 'try do delete a publication without remote dataset, weird')
    await mongo.publications.deleteOne({ _id: pub._id })
    return
  }

  await plugin.deleteDataset({
    catalogConfig: catalog.config,
    datasetId: pub.remoteDataset.id,
    resourceId: pub.remoteResource?.id
  })
  await mongo.publications.deleteOne({ _id: pub._id })
}

export default { process }
