import type { Catalog, Publication, Import } from '#types'

import mongo from '@data-fair/lib-node/mongo.js'
import config from '#config'

export class CatalogsMongo {
  get client () {
    return mongo.client
  }

  get db () {
    return mongo.db
  }

  get catalogs () {
    return mongo.db.collection<Catalog>('catalogs')
  }

  get imports () {
    return mongo.db.collection<Import>('imports')
  }

  get publications () {
    return mongo.db.collection<Publication>('publications')
  }

  async connect () {
    await mongo.connect(config.mongoUrl)
  }

  async init () {
    await mongo.connect(config.mongoUrl)
    await mongo.configure({
      catalogs: {
        // We always get catalogs by owner type and id
        main: { 'owner.type': 1, 'owner.id': 1 }
      },
      imports: {
        // Get imports by catalog and owner
        main: { 'catalog.id': 1, 'owner.type': 1, 'owner.id': 1 },
        // For each worker loop, we get random imports with status waiting or running
        status: { status: 1 },

        // Deprecated primaryKey, we can import the same remote resource
        // many times in the same catalog
        // An import is unique by catalog and remoteResource
        // primaryKey: [{ 'catalog.id': 1, 'remoteResource.id': 1 }, { unique: true }]
        primaryKey: null
      },
      publications: {
        // Get publications by catalog and owner
        main: { 'catalog.id': 1, 'owner.type': 1, 'owner.id': 1 },
        // An publication is unique by catalog and dataFairDataset
        primaryKey: [{ 'catalog.id': 1, 'dataFairDataset.id': 1 }, { unique: true }],
        // Get publications by dataset
        dataset: { 'dataFairDataset.id': 1, 'owner.type': 1, 'owner.id': 1 },
        // For each worker loop, we get random publications with status waiting or running
        status: { status: 1 }
      }
    })
  }
}

const catalogsMongo = new CatalogsMongo()
export default catalogsMongo
