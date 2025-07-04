import { httpError, type SessionStateAuthenticated } from '@data-fair/lib-express'
import type CatalogPlugin from '@data-fair/types-catalogs'
import type { Catalog } from '#types'

import eventsQueue from '@data-fair/lib-node/events-queue.js'
import { cipher, decipherSecrets } from '@data-fair/catalogs-shared/cipher.ts'
import { getPlugin } from '../plugins/service.ts'
import config from '#config'

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
  if (!config.privateEventsUrl && !config.secretKeys.events) return

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
  const plugin: CatalogPlugin = await getPlugin(validCatalog.plugin)
  plugin.assertConfigValid(validCatalog.config)
  return validCatalog
}

export const prepareCatalog = async (catalog: Catalog) => {
  const ret: {
    config?: Catalog['config'],
    secrets?: Catalog['secrets'],
    capabilities?: Catalog['capabilities']
    thumbnailUrl?: Catalog['thumbnailUrl']
  } = {}

  const plugin = await getPlugin(catalog.plugin)
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
    ret.secrets = {}
    for (const key of Object.keys(prepareRes.secrets)) {
      ret.secrets[key] = cipher(prepareRes.secrets[key], config.cipherPassword)
    }
  }
  if (prepareRes.thumbnailUrl !== undefined) ret.thumbnailUrl = prepareRes.thumbnailUrl

  return ret
}
