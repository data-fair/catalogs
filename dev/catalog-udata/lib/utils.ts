import type { CatalogDataset, CatalogResourceDataset, CatalogContext } from '@data-fair/lib-common-types/catalog.js'
import { UDataConfig } from '../types/config/index.ts'

export const prepareDatasetFromCatalog = (context: CatalogContext<UDataConfig>, udataDataset: any) => {
  const dataset: CatalogDataset = {
    id: udataDataset.id,
    title: udataDataset.title,
    description: udataDataset.description,
    keywords: udataDataset.tags,
    origin: udataDataset.uri,
    private: udataDataset.private,
    resources: udataDataset.resources.map((udataResource: any) => {
      const resource: CatalogResourceDataset = {
        id: udataResource.id,
        title: udataResource.title,
        format: udataResource.format,
        url: udataResource.url,
        mimeType: udataResource.mime,
        size: udataResource.fileSize
      }
      if (udataResource.extras && (udataResource.extras.datafairOrigin === context.publicUrl || udataResource.extras.datafairOrigin === context.catalogConfig.dataFairBaseUrl)) {
        resource.datafairDatasetId = udataResource.extras.datafairDatasetId
      }
      return resource
    })
  }
  if (udataDataset.extras && udataDataset.extras.datafairOrigin === context.publicUrl) {
    dataset.datafairDatasetId = udataDataset.extras.datafairDatasetId
  }
  return dataset
}

export const createOrUpdateDataset = async (context: CatalogContext<UDataConfig>, dataset: any, publication: any) => {
  const datasetUrl = getDatasetUrl(context, dataset)
  const resources = []
  if (!dataset.isMetaOnly) {
    resources.push({
      title: 'Description des champs',
      description: 'Description détaillée et types sémantiques des champs',
      url: datasetUrl,
      type: 'documentation',
      filetype: 'remote',
      format: 'Page Web',
      mime: 'text/html',
      extras: {
        datafairEmbed: 'fields'
      }
    })
    resources.push({
      title: 'Documentation de l\'API',
      description: 'Documentation interactive de l\'API à destination des développeurs. La description de l\'API utilise la spécification [OpenAPI 3.0.1](https://github.com/OAI/OpenAPI-Specification)',
      url: datasetUrl,
      type: 'documentation',
      filetype: 'remote',
      format: 'Page Web',
      mime: 'text/html',
      extras: {
        apidocUrl: `${catalog.dataFairBaseUrl || config.publicUrl}/api/v1/datasets/${dataset.id}/api-docs.json`
      }
    })
    resources.push({
      title: 'Consultez les données',
      description: `Consultez directement les données dans ${dataset.bbox ? 'une carte interactive' : 'un tableau'}.`,
      url: datasetUrl,
      type: 'main',
      filetype: 'remote',
      format: 'Page Web',
      mime: 'text/html',
      extras: {
        datafairEmbed: dataset.bbox ? 'map' : 'table'
      }
    })
  }

  // TODO: use data-files ?
  if (dataset.file) {
    const originalFileFormat = dataset.originalFile.name.split('.').pop()
    resources.push({
      title: `Fichier ${originalFileFormat}`,
      description: `Téléchargez le fichier complet au format ${originalFileFormat}.`,
      url: `${catalog.dataFairBaseUrl || config.publicUrl}/api/v1/datasets/${dataset.id}/raw`,
      type: 'main',
      filetype: 'remote',
      filesize: dataset.originalFile.size,
      mime: dataset.originalFile.mimetype,
      format: originalFileFormat
    })
    if (dataset.file.mimetype !== dataset.originalFile.mimetype) {
      const fileFormat = dataset.file.name.split('.').pop()
      resources.push({
        title: `Fichier ${fileFormat}`,
        description: `Téléchargez le fichier complet au format ${fileFormat}.`,
        url: `${catalog.dataFairBaseUrl || config.publicUrl}/api/v1/datasets/${dataset.id}/convert`,
        type: 'main',
        filetype: 'remote',
        filesize: dataset.file.size,
        mime: dataset.file.mimetype,
        format: fileFormat
      })
    }
  }

  for (const attachment of dataset.attachments || []) {
    if (!attachment.includeInCatalogPublications) continue
    if (attachment.type === 'url') {
      resources.push({
        title: attachment.title,
        description: attachment.description,
        url: attachment.url
      })
    }
    if (attachment.type === 'file') {
      resources.push({
        title: attachment.title,
        description: attachment.description,
        url: `${catalog.dataFairBaseUrl || config.publicUrl}/api/v1/datasets/${dataset.id}/metadata-attachments/${attachment.name}`,
        filetype: 'remote',
        filesize: attachment.size,
        mime: attachment.mimetype,
        format: attachment.name.split('.').pop()
      })
    }
    if (attachment.type === 'remoteFile') {
      resources.push({
        title: attachment.title,
        description: attachment.description,
        url: `${catalog.dataFairBaseUrl || config.publicUrl}/api/v1/datasets/${dataset.id}/metadata-attachments/${attachment.name}`,
        filetype: 'remote',
        format: attachment.name.split('.').pop()
      })
    }
  }

  const udataDataset = {
    title: dataset.title,
    description: dataset.description || dataset.title,
    private: !dataset.public,
    extras: {
      datafairOrigin: catalog.dataFairBaseUrl || config.publicUrl,
      datafairDatasetId: dataset.id
    },
    resources
  }
  if (dataset.frequency) udataDataset.frequency = dataset.frequency
  if (dataset.temporal && dataset.temporal.start) {
    udataDataset.temporal_coverage = {
      start: moment(dataset.temporal.start).toISOString()
    }
    if (dataset.temporal.end) {
      udataDataset.temporal_coverage.end = moment(dataset.temporal.end).toISOString()
    } else {
      udataDataset.temporal_coverage.end = udataDataset.temporal_coverage.start
    }
  }
  // We do not propagate spatial coverage for the moment as we can't push custom text
  // See https://www.data.gouv.fr/api/1/spatial/granularities/
  // if (dataset.spatial) udataDataset.spatial = { granularity: dataset.spatial }
  if (dataset.keywords && dataset.keywords.length) udataDataset.tags = dataset.keywords
  if (dataset.license) {
    const remoteLicenses = (await axios.get(new URL('api/1/datasets/licenses/', catalog.url).href, { headers: { 'X-API-KEY': catalog.apiKey } })).data
    const remoteLicense = remoteLicenses.find(l => l.url === dataset.license.href)
    if (remoteLicense) udataDataset.license = remoteLicense.id
  }

  if (catalog.organization && catalog.organization.id) {
    udataDataset.organization = { id: catalog.organization.id }
  }

  const updateDatasetId = publication.result && publication.result.id
  let existingDataset
  if (updateDatasetId) {
    delete publication.replaceDataset
    try {
      existingDataset = (await axios.get(new URL('api/1/datasets/' + updateDatasetId + '/', catalog.url).href, { headers: { 'X-API-KEY': catalog.apiKey } })).data
      debug('existing dataset', existingDataset.uri)
      if (!existingDataset || existingDataset.deleted) throw new Error(`Impossible de récupérer le jeu de données existant depuis ${catalog.url}. A-t-il été supprimé du catalogue ?`)

      // preserving resource id so that URLs are not broken
      if (existingDataset.resources) {
        for (const resource of udataDataset.resources) {
          const matchingResource = existingDataset.resources.find(r => resource.url === r.url && equal(resource.extras || {}, r.extras || {}))
          if (matchingResource) resource.id = matchingResource.id
        }
      }
    } catch (err) {
      debug('failure to fetch existing dataset', err)
      if (err.response) throw new Error(`Erreur lors de la récupération jeu de données existant depuis ${catalog.url} : ${err.status} - ${JSON.stringify(err.data, null, 2)}`)
      else throw err
    }
  }

  try {
    let res
    if (updateDatasetId && existingDataset) {
      debug('merge over existing dataset')
      Object.assign(existingDataset, udataDataset)
      res = await axios.put(new URL('api/1/datasets/' + updateDatasetId + '/', catalog.url).href, existingDataset, { headers: { 'X-API-KEY': catalog.apiKey } })
    } else {
      const replaceDatasetId = publication.replaceDataset && publication.replaceDataset.id
      if (replaceDatasetId) {
        debug('overwrite existing dataset entirely', replaceDatasetId)
        res = await axios.put(new URL('api/1/datasets/' + replaceDatasetId + '/', catalog.url).href, udataDataset, { headers: { 'X-API-KEY': catalog.apiKey } })
      } else {
        debug('create dataset')
        res = await axios.post(new URL('api/1/datasets/', catalog.url).href, udataDataset, { headers: { 'X-API-KEY': catalog.apiKey } })
      }
    }

    if (!res.data.page || typeof res.data.page !== 'string') {
      throw new Error(`Erreur lors de l'envoi à ${catalog.url} : le format de retour n'est pas correct.`)
    }
    publication.targetUrl = res.data.page
    publication.result = { id: res.data.id, slug: res.data.slug }
  } catch (err) {
    debug('failure to push dataset', err)
    if (err.response) throw new Error(`Erreur lors de l'envoi du jeu de données à ${catalog.url} : ${err.status} - ${JSON.stringify(err.data, null, 2)}`)
    else throw err
  }
}

const getDatasetUrl = ({ catalogConfig, publicUrl }: CatalogContext<UDataConfig>, dataset: any) => {
  if (catalogConfig.datasetUrlTemplate) {
    return catalogConfig.datasetUrlTemplate.replace('{id}', dataset.id).replace('{slug}', dataset.slug)
  }
  return `${publicUrl}/dataset/${dataset.id}`
}
