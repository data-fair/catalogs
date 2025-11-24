import type { Catalog, Publication, Import } from '#api/types'

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
  }
}

const catalogsMongo = new CatalogsMongo()
export default catalogsMongo
