// the dev ports come from .env (copied from dev/default.env by npm run dev-deps); the production names of
// custom-environment-variables.mjs (MONGO_URL, PRIVATE_DATA_FAIR_URL, DATA_FAIR_API_KEY...) override this file
/** @param {string} name */
const envPort = (name) => {
  const port = process.env[name]
  if (!port) throw new Error(`${name} must be set, run "npm run dev-deps" (it creates .env from dev/default.env)`)
  return port
}
// optional services (events): turned off ('') when their port variable is empty
/** @param {string | undefined} port */
const optionalUrl = (port) => port ? `http://localhost:${port}` : ''

export default {
  cipherPassword: 'dev-cipher-password-0123456789abcdef',
  dataDir: '../data/development',
  // none by default (DATA_FAIR_API_KEY sets one): the worker then uses the key the test setup handed over
  // (worker/src/lib/data-fair-api-key.ts)
  dataFairAPIKey: '',
  host: `${process.env.DEV_HOST ?? 'localhost'}:${envPort('NGINX_PORT')}`,
  mongoUrl: `mongodb://localhost:${envPort('MONGO_PORT')}/data-fair-catalogs-development`,
  observer: {
    active: false
  },
  privateDataFairUrl: `http://localhost:${envPort('DF_PORT')}`,
  privateEventsUrl: optionalUrl(process.env.EVENTS_PORT),
  privateRegistryUrl: `http://localhost:${envPort('REGISTRY_PORT')}`,
  secretKeys: {
    events: 'secret-events',
    registry: 'secret-registry-internal'
  },
  upgradeRoot: '../'
}
