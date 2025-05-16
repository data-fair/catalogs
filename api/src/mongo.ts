import type { Catalog, Export, Import } from '#types'

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

  get exports () {
    return this.mongo.db.collection<Export>('exports')
  }

  get imports () {
    return this.mongo.db.collection<Import>('imports')
  }

  constructor () {
    this.mongo = new Mongo()
  }

  init = async () => {
    await this.mongo.connect(config.mongoUrl)
    await this.mongo.configure({
      catalogs: {
        main: { 'owner.type': 1, 'owner.id': 1 } // Frequently get catalogs by owner
      },
      exports: {
        main: { catalogId: 1, 'owner.type': 1, 'owner.id': 1 }, // Frequently get exports by catalogId and owner
        dataset: { dataFairDatasetId: 1, 'owner.type': 1, 'owner.id': 1 }, // Frequently get exports of a dataset
        status: { status: 1 }, // For each worker loop, we get random exports with status waiting or running
      },
      imports: {
        main: { catalogId: 1, 'owner.type': 1, 'owner.id': 1 }, // Frequently get imports by catalogId and owner
        status: { status: 1 }, // For each worker loop, we get random imports with status waiting or running
      }
    })
  }

  async close () {
    await this.mongo.client.close()
  }
}

const catalogsMongo = new CatalogsMongo()
export default catalogsMongo
