import type { Import } from '#types'

import { emit as wsEmit } from '@data-fair/lib-node/ws-emitter.js'
import eventsQueue from '@data-fair/lib-node/events-queue.js'
import type { SessionStateAuthenticated } from '@data-fair/lib-express'
import { getNextImportDate } from '@data-fair/catalogs-shared/cron.ts'
import mongo from '#mongo'

const importTitles = {
  create: (title: string) => ({ en: `The import of the resource ${title} was created`, fr: `L'import de la ressource ${title} a été créé` }),
  update: (title: string) => ({ en: `The import of the resource ${title} was updated`, fr: `L'import de la ressource ${title} a été modifié` }),
  delete: (title: string) => ({ en: `The import of the resource ${title} was deleted`, fr: `L'import de la ressource ${title} a été supprimé` }),
  replace: (title: string) => ({
    en: `The import of the resource ${title} was deleted (replaced by a new import)`,
    fr: `L'import de la ressource ${title} a été supprimé (remplacé par un nouvel import)`
  })
}

/**
 * Send an event about an import (its errors are sent by the worker).
 * @param topicAction The action part of the topic key
 * @param textAction The text of the title, when it is more precise than the topic action
 */
export const sendImportEvent = (
  imp: Import,
  topicAction: 'create' | 'update' | 'delete',
  sessionState: SessionStateAuthenticated,
  textAction: keyof typeof importTitles = topicAction
) => {
  eventsQueue.pushEvent({
    title: importTitles[textAction](imp.remoteResource.title || imp.remoteResource.id),
    topic: { key: `catalogs:import-${topicAction}:${imp._id}` },
    sender: imp.owner,
    resource: {
      type: 'catalog',
      id: imp.catalog.id,
      title: imp.catalog.title,
    }
  }, sessionState)
}

/**
 * Check that an import object is valid
 */
export const validateImport = async (imp: Partial<Import>) => {
  return (await import('#types/import/index.ts')).returnValid(imp)
}

/**
 * Apply changes to an import (a PATCH, or a PUT of its configuration): null removes a property.
 * Computes the next import date when the scheduling changes, stamps the update, validates and saves
 * the result, sends the event and the websocket update. Returns the saved import.
 */
export const updateImport = async (importDoc: Import, changes: Record<string, any>, sessionState: SessionStateAuthenticated) => {
  changes = { ...changes }
  // Set the next import date based on scheduling if scheduling was updated
  if (changes.scheduling !== undefined) {
    if (!changes.scheduling || (Array.isArray(changes.scheduling) && changes.scheduling.length === 0)) {
      changes.nextImportDate = null
    } else {
      changes.nextImportDate = getNextImportDate(changes.scheduling)
    }
  }
  changes.updated = { id: sessionState.user.id, name: sessionState.user.name, date: new Date().toISOString() }

  const patch: Record<string, any> = {}
  const merged: Record<string, any> = { ...importDoc }
  for (const key in changes) {
    if (changes[key] === null) {
      patch.$unset = patch.$unset || {}
      patch.$unset[key] = true
      delete merged[key]
    } else {
      patch.$set = patch.$set || {}
      patch.$set[key] = merged[key] = changes[key]
    }
  }
  const patchedImport = await validateImport(merged)
  await mongo.imports.updateOne({ _id: importDoc._id }, patch)

  sendImportEvent(patchedImport, 'update', sessionState)
  await wsEmit(`import/${importDoc._id}`, patchedImport)
  return patchedImport
}
