import type { Catalog, Publication } from '#api/types'
import type CatalogPlugin from '@data-fair/types-catalogs'
import type { AxiosRequestConfig } from 'axios'

import { emit as wsEmit } from '@data-fair/lib-node/ws-emitter.js'
import log from '@data-fair/lib-node/log.js'
import { sendTaskErrorEvent } from './events.ts'
import { decipherSecrets } from '@data-fair/catalogs-shared/cipher.ts'
// data-fair is a service of our own infrastructure (configured private URL, not user input)
import { privateAxiosInstance as axios } from '@data-fair/lib-node/axios.js'
import prepareLog from './logs.ts'
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
  let dataFairDataset
  let isAccessDenied = false
  try {
    dataFairDataset = (await axios.get(`/api/v1/datasets/${pub.dataFairDataset.id}`, getAxiosOptions(catalog))).data
  } catch (error: any) {
    if (error.status === 403) {
      isAccessDenied = true
    } else {
      throw error
    }
  }

  // 2. Check permissions
  // If the catalog has a department, check if the dataset is owned by the same department
  if (
    isAccessDenied ||
    catalog.owner.type !== dataFairDataset.owner.type ||
    catalog.owner.id !== dataFairDataset.owner.id ||
    (catalog.owner.department && catalog.owner.department !== dataFairDataset.owner.department)
  ) {
    const errorMsg = "You don't have permission to publish this dataset in this catalog. This may be due to a change of ownership for the dataset or the catalog."
    await mongo.publications.updateOne({ _id: pub._id }, { $set: { status: 'error', logs: [{ date: new Date().toISOString(), msg: errorMsg, type: 'error' }] } })
    await wsEmit(`publication/${pub._id}`, { status: 'error', logs: [{ date: new Date().toISOString(), msg: errorMsg, type: 'error' }] })
    sendTaskErrorEvent('publication', pub, dataFairDataset?.title || pub.dataFairDataset.title || pub.dataFairDataset.id)
    // the owner lost its permissions on the dataset, expected and reported to the owner
    return log.warn(errorMsg, { code: 'worker-missing-permissions' })
  }

  if (!dataFairDataset) {
    await mongo.publications.deleteOne({ _id: pub._id })
    return log.error('found a publication without associated dataset, weird', { code: 'worker-missing-dataset' })
  }

  // Check if the plugin has the capability to publish (and delete) datasets
  if (!plugin.metadata.capabilities.some(c => ['createFolderInRoot', 'createFolder', 'createResource', 'replaceFolder', 'replaceResource'].includes(c))) {
    await mongo.publications.deleteOne({ _id: pub._id })
    return log.error('found a publication without the capability to publish datasets, weird', { code: 'worker-missing-capabilities' })
  }

  await publish(catalog, plugin, pub, dataFairDataset)
}

const publish = async (catalog: Catalog, plugin: CatalogPlugin, pub: Publication, dataFairDataset: Record<string, any>) => {
  // 3. Check if publicationSite is required
  const requiresPublicationSite = catalog.capabilities.includes('requiresPublicationSite')
  if (requiresPublicationSite && !pub.publicationSite) {
    const errorMsg = 'Publication site is required for this catalog'
    await mongo.publications.updateOne({ _id: pub._id }, { $set: { status: 'error', error: errorMsg } })
    await wsEmit(`publication/${pub._id}`, { status: 'error', error: errorMsg })
    // a configuration error of the owner, reported on the publication
    return log.warn(errorMsg, { code: 'worker-missing-publication-site' })
  }

  // 4. Publish the dataset
  const publishContext: any = {
    catalogConfig: catalog.config,
    secrets: decipherSecrets(catalog.secrets, config.cipherPassword),
    dataset: dataFairDataset,
    publication: {
      action: pub.action,
      remoteFolder: pub.remoteFolder,
      remoteResource: pub.remoteResource
    },
    log: prepareLog(pub, 'publication')
  }
  if (requiresPublicationSite) {
    publishContext.publicationSite = pub.publicationSite
  }

  const publicationRes = await plugin.publishDataset(publishContext)

  // 5. Update the publication status
  pub.dataFairDataset.title = dataFairDataset.title
  pub.catalog.title = catalog.title
  Object.assign(pub, {
    remoteFolder: publicationRes.remoteFolder,
    remoteResource: publicationRes.remoteResource
  })

  // If the action was to create a folder or resource, change it to replace for the next publication
  if (pub.action === 'createFolderInRoot' || pub.action === 'createFolder') {
    pub.action = 'replaceFolder'
  } else if (pub.action === 'createResource') {
    pub.remoteFolder = undefined // Reset it to avoid confusion, replace a resource is not linked to a folder
    pub.action = 'replaceResource'
  }

  pub.status = 'done'
  pub.lastPublicationDate = new Date().toISOString()
  const validPublication = (await import('../../../api/types/publication/index.ts')).returnValid(pub)

  await mongo.publications.updateOne({ _id: pub._id }, { $set: validPublication })
  await wsEmit(`publication/${pub._id}`, validPublication)
}

const deletePublication = async (catalog: Catalog, plugin: CatalogPlugin, pub: Publication) => {
  if (!pub.remoteFolder && !pub.remoteResource) {
    log.error('try to delete a publication without remote folder or resource, weird', { code: 'worker-missing-remote' })
  } else {
    try {
      await plugin.deletePublication({
        catalogConfig: catalog.config,
        secrets: decipherSecrets(catalog.secrets, config.cipherPassword),
        folderId: pub.remoteFolder?.id,
        resourceId: pub.remoteResource?.id,
        log: prepareLog(pub, 'publication')
      })
    } catch (error: any) {
      // the remote catalog failed, not us
      log.warn('error while deleting the remote publication', { code: 'worker-delete-publication-error', err: error })
      // Ignore errors during deletion, we will delete the publication anyway
    }
  }

  await mongo.publications.deleteOne({ _id: pub._id })
  await wsEmit(`publication/${pub._id}/deleted`, { }) // Notify the UI that the publication has been deleted

  if (catalog.deletionRequested) {
    const remainingPublications = await mongo.publications.findOne({ 'catalog.id': catalog._id })
    if (!remainingPublications) await mongo.catalogs.deleteOne({ _id: catalog._id })
  }
}

export default { process }
