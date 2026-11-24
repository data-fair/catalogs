import config from '#config'
import mongo from '#mongo'

let key = config.dataFairAPIKey

/** The API key of the requests to data-fair (x-apiKey): an adminMode key acting as the task's owner (x-account). */
export const dataFairAPIKey = () => key

/**
 * Called before each task. Without a configured key (DATA_FAIR_API_KEY), in development, the key the test setup
 * handed over: it creates the key through data-fair's API (tests/support/data-fair.ts) and stores it in this
 * database through the test API (PUT /api/test-env/data-fair-api-key).
 */
export const refreshDataFairAPIKey = async () => {
  if (config.dataFairAPIKey || process.env.NODE_ENV !== 'development') return
  const doc = await mongo.db.collection<{ _id: string, key: string }>('test-env').findOne({ _id: 'data-fair-api-key' })
  key = doc?.key ?? ''
}
