import type { Catalog, Publication } from '#api/types'
import type CatalogPlugin from '@data-fair/types-catalogs'
import type { AxiosRequestConfig } from 'axios'

import { emit as wsEmit } from '@data-fair/lib-node/ws-emitter.js'
import { internalError } from '@data-fair/lib-node/observer.js'
import eventsQueue from '@data-fair/lib-node/events-queue.js'
import { decipherSecrets } from '@data-fair/catalogs-shared/cipher.ts'
import axios from '@data-fair/lib-node/axios.js'
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
    await wsEmit(`publication/${pub._id}`, { status: 'error', error: errorMsg })
    eventsQueue.pushEvent({
      title: `La publication du jeu de données ${dataFairDataset.title} a échoué`,
      topic: { key: `catalogs:publication-error:${pub._id}` },
      sender: pub.owner,
      resource: {
        type: 'catalog',
        id: pub.catalog.id,
        title: 'Catalogue associé : ' + pub.catalog.title
      },
      originator: {
        internalProcess: {
          id: 'catalogs-worker',
          name: 'Catalogs Worker'
        }
      }
    })
    return internalError('worker-missing-permissions', errorMsg)
  }

  // Check if the plugin has the capability to publish (and delete) datasets
  if (!plugin.metadata.capabilities.some(c => ['createFolderInRoot', 'createFolder', 'createResource', 'replaceFolder', 'replaceResource'].includes(c))) {
    await mongo.publications.deleteOne({ _id: pub._id })
    return internalError('worker-missing-capabilities', 'found a publication without the capability to publish datasets, weird')
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
    return internalError('worker-missing-publication-site', errorMsg)
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
    internalError('worker-missing-remote', 'try do delete a publication without remote folder or resource, weird')
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
      internalError('worker-delete-publication-error', `Error while deleting publication: ${error.message}`, error)
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
