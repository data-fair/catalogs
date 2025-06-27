// Webhooks for Simple Directory

import Debug from 'debug'
import { createIdentitiesRouter } from '@data-fair/lib-express/identities/index.js'
import config from '#config'
import mongo from '#mongo'

const debug = Debug('webhooks-simple-directory')

export default createIdentitiesRouter(
  config.secretKeys.identities,
  // onUpdate
  async (identity) => {
    debug('Incoming sd webhook for update', identity)

    const filter = { 'owner.type': identity.type, 'owner.id': identity.id }
    const update = { $set: { 'owner.name': identity.name } }

    await mongo.catalogs.updateMany(filter, update)
    await mongo.imports.updateMany(filter, update)
    await mongo.publications.updateMany(filter, update)

    if (identity.departments) {
      for (const department of identity.departments) {
        const filter = { 'owner.type': identity.type, 'owner.id': identity.id, 'owner.department': department.id }
        const update = { $set: { 'owner.departmentName': department.name } }

        await mongo.catalogs.updateMany(filter, update)
        await mongo.imports.updateMany(filter, update)
        await mongo.publications.updateMany(filter, update)
      }
    }
  },

  // onDelete
  async (identity) => {
    debug('Incoming sd webhook for delete', identity)
    // Delete all catalogs, imports and publications for this identity
    const filter = { 'owner.type': identity.type, 'owner.id': identity.id }

    await mongo.catalogs.deleteMany(filter)
    await mongo.imports.deleteMany(filter)
    await mongo.publications.deleteMany(filter)

    // Remote datasets are not deleted, only the links to them
    // When departments are deleted, do nothing
  }
)
