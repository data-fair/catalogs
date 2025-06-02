import type { Catalog, Publication, Import } from '#types'

import { Mongo } from '@data-fair/lib-node/mongo.js'
import config from '#config'

export class CatalogsMongo {
  private mongo: Mongo
  get client () {
    return this.mongo.client
  }

  get db () {
    return this.mongo.db
  }

  get catalogs () {
    return this.mongo.db.collection<Catalog>('catalogs')
  }

  get imports () {
    return this.mongo.db.collection<Import>('imports')
  }

  get publications () {
    return this.mongo.db.collection<Publication>('publications')
  }

  constructor () {
    this.mongo = new Mongo()
  }

  init = async () => {
    await this.mongo.connect(config.mongoUrl)
    await this.mongo.configure({
      catalogs: {
        // We always get catalogs by owner type and id
        main: { 'owner.type': 1, 'owner.id': 1 }
      },
      imports: {
        // Get imports by catalog and owner
        main: { 'catalog.id': 1, 'owner.type': 1, 'owner.id': 1 },
        // An import is unique by catalog and remoteResource
        primaryKey: [{ 'catalog.id': 1, 'remoteResource.id': 1 }, { unique: true }],
        // For each worker loop, we get random imports with status waiting or running
        status: { status: 1 }
      },
      publications: {
        // Get publications by catalog and owner
        main: { 'catalog.id': 1, 'owner.type': 1, 'owner.id': 1 },
        // Get publications by dataset
        dataset: { 'dataFairDataset.id': 1, 'owner.type': 1, 'owner.id': 1 },
        // For each worker loop, we get random publications with status waiting or running
        status: { status: 1 }
      }
    })
  }

  async close () {
    await this.mongo.client.close()
  }
}

const catalogsMongo = new CatalogsMongo()
export default catalogsMongo
