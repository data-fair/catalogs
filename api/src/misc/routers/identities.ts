// Webhooks for Simple Directory

import Debug from 'debug'
import { createIdentitiesRouter } from '@data-fair/lib-express/identities/index.js'
import config from '#config'
import mongo from '#mongo'

const debug = Debug('webhooks-simple-directory')

/** Helper function to update all collections */
const updateAllCollections = async (filter: any, update: any) => {
  await Promise.all([
    mongo.catalogs.updateMany(filter, update),
    mongo.imports.updateMany(filter, update),
    mongo.publications.updateMany(filter, update)
  ])
}

/** Helper function to delete from all collections */
const deleteFromAllCollections = async (filter: any) => {
  await Promise.all([
    mongo.catalogs.deleteMany(filter),
    mongo.imports.deleteMany(filter),
    mongo.publications.deleteMany(filter)
  ])
}

export default createIdentitiesRouter(
  config.secretKeys.identities,
  // onUpdate
  async (identity) => {
    debug('Incoming sd webhook for update', identity)

    // Update owner name
    await updateAllCollections(
      { 'owner.type': identity.type, 'owner.id': identity.id },
      { $set: { 'owner.name': identity.name } }
    )

    if (identity.type === 'user') {
      // Update created/updated name
      await Promise.all([
        updateAllCollections(
          { 'created.id': identity.id },
          { $set: { 'created.name': identity.name } }
        ),
        updateAllCollections(
          { 'updated.id': identity.id },
          { $set: { 'updated.name': identity.name } }
        )
      ])
    }

    if (identity.departments) {
      // Update department names
      const departmentUpdates = identity.departments.map(department =>
        updateAllCollections(
          { 'owner.type': identity.type, 'owner.id': identity.id, 'owner.department': department.id },
          { $set: { 'owner.departmentName': department.name } }
        )
      )
      await Promise.all(departmentUpdates)
    }
  },

  // onDelete
  async (identity) => {
    debug('Incoming sd webhook for delete', identity)
    // Delete all catalogs, imports and publications for this identity
    await deleteFromAllCollections({ 'owner.type': identity.type, 'owner.id': identity.id })

    // Remote datasets are not deleted, only the links to them
    // When departments are deleted, do nothing
  }
)
