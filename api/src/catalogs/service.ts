import { httpError, type SessionStateAuthenticated } from '@data-fair/lib-express'
import type CatalogPlugin from '@data-fair/types-catalogs'
import type { Catalog } from '#types'

import eventsQueue from '@data-fair/lib-node/events-queue.js'
import { cipher, decipherSecrets } from '@data-fair/catalogs-shared/cipher.ts'
import { getPlugin } from '../plugins/service.ts'
import config from '#config'
import mongo from '#mongo'

/**
 * Helper function to send events related to catalogs
 * @param catalog The catalog object
 * @param actionText The text describing the action (e.g. "a été créé")
 * @param topicAction The action part of the topic key (e.g. "create", "delete")
 * @param sessionState Optional session state for authentication
 */
export const sendCatalogEvent = (
  catalog: Catalog,
  actionText: string,
  topicAction: string,
  sessionState?: SessionStateAuthenticated
) => {
  eventsQueue.pushEvent({
    title: `Le catalogue ${catalog.title} ${actionText}`,
    topic: { key: `catalogs:catalog-${topicAction}:${catalog._id}` },
    sender: catalog.owner,
    resource: {
      type: 'catalog',
      id: catalog._id,
      title: catalog.title,
    }
  }, sessionState)
}

/**
 * Check that a catalog object is valid
 * Check if the plugin exists
 * Check if the config is valid
 */
export const validateCatalog = async (catalog: Partial<Catalog>) => {
  const validCatalog = (await import('#types/catalog/index.ts')).returnValid(catalog)
  const resolved = await getPlugin(validCatalog.plugin, validCatalog.owner)
  const plugin: CatalogPlugin = resolved.plugin
  plugin.assertConfigValid(validCatalog.config)
  return validCatalog
}

export const prepareCatalog = async (catalog: Catalog) => {
  const ret: Partial<Pick<Catalog, 'config' | 'secrets' | 'capabilities' | 'thumbnailUrl'>> = {}

  const { plugin } = await getPlugin(catalog.plugin, catalog.owner)
  let prepareRes
  try {
    prepareRes = await plugin.prepare({
      catalogConfig: catalog.config,
      capabilities: catalog.capabilities,
      secrets: decipherSecrets(catalog.secrets, config.cipherPassword)
    })
  } catch (error: any) {
    throw httpError(400, `Invalid configuration: ${error.message || 'Unknown error'}`)
  }

  if (prepareRes.catalogConfig) ret.config = prepareRes.catalogConfig as Catalog['config']
  if (prepareRes.capabilities) ret.capabilities = prepareRes.capabilities
  if (prepareRes.secrets) {
    // an unchanged secret keeps its stored cipher (a save of the masked value must not rewrite it)
    const previous = decipherSecrets(catalog.secrets, config.cipherPassword)
    ret.secrets = {}
    for (const key of Object.keys(prepareRes.secrets)) {
      const stored = catalog.secrets?.[key]
      ret.secrets[key] = stored && previous[key] === prepareRes.secrets[key] ? stored : cipher(prepareRes.secrets[key], config.cipherPassword)
    }
  }
  if (prepareRes.thumbnailUrl !== undefined) ret.thumbnailUrl = prepareRes.thumbnailUrl

  return ret
}

/**
 * Apply changes to a catalog (a PATCH, or a PUT of its configuration): null removes a property.
 * Validates the result, lets the plugin prepare it (secrets, capabilities, thumbnail), stamps the
 * update and sends the event. Returns the saved catalog, without its secrets.
 */
export const updateCatalog = async (catalog: Catalog, changes: Record<string, any>, sessionState: SessionStateAuthenticated) => {
  changes = {
    ...changes,
    updated: { id: sessionState.user.id, name: sessionState.user.name, date: new Date().toISOString() }
  }
  const patch: Record<string, any> = { $set: {} }
  const set: Record<string, any> = {}
  for (const key in changes) {
    if (changes[key] === null) {
      patch.$unset = patch.$unset || {}
      patch.$unset[key] = true
    } else {
      patch.$set[key] = set[key] = changes[key]
    }
  }
  const unset = Object.keys(patch.$unset ?? {})
  const merged: Record<string, any> = { ...catalog, ...set }
  for (const key of unset) delete merged[key]
  const patchedCatalog = await validateCatalog(merged)
  const preparedCatalog = await prepareCatalog(patchedCatalog)
  Object.assign(patch.$set, preparedCatalog)
  Object.assign(patchedCatalog, preparedCatalog)

  await mongo.catalogs.updateOne({ _id: catalog._id }, patch)
  sendCatalogEvent(patchedCatalog, 'a été modifié', 'patch', sessionState)
  delete patchedCatalog.secrets // Do not return secrets in the response
  return patchedCatalog
}
