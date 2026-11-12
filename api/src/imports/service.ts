import type { Import } from '#types'

import { emit as wsEmit } from '@data-fair/lib-node/ws-emitter.js'
import eventsQueue from '@data-fair/lib-node/events-queue.js'
import type { SessionStateAuthenticated } from '@data-fair/lib-express'
import { getNextImportDate } from '@data-fair/catalogs-shared/cron.ts'
import { type EventAction, eventText } from '@data-fair/catalogs-shared/event-texts.ts'
import mongo from '#mongo'

/**
 * Helper function to send events related to imports
 * @param imp The import object
 * @param topicAction The action part of the topic key (e.g. "create", "delete")
 * @param sessionState Session state for authentication
 * @param textAction The action whose text is the title, when it is more precise than the topic one
 */
export const sendImportEvent = (
  imp: Import,
  topicAction: 'create' | 'update' | 'delete',
  sessionState: SessionStateAuthenticated,
  textAction: EventAction<'import'> = topicAction
) => {
  eventsQueue.pushEvent({
    title: eventText(`import-${textAction}`, { title: imp.remoteResource.title }),
    body: eventText('catalog', { title: imp.catalog.title }),
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
