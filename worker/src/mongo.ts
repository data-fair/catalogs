import type { Catalog, Export, Import } from '#api/types'

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
  }

  async close () {
    await this.mongo.client.close()
  }
}

const catalogsMongo = new CatalogsMongo()
export default catalogsMongo
