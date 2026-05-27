const mongoPort = process.env.MONGO_PORT ?? '27017'
const eventsPort = process.env.EVENTS_PORT ?? '8088'
const registryPort = process.env.REGISTRY_PORT ?? '8089'
const devHost = process.env.DEV_HOST ?? 'localhost'
const nginxPort = process.env.NGINX_PORT ?? '5600'

export default {
  cipherPassword: 'dev',
  dataDir: '../data/development',
  dataFairAPIKey: '', // override in worker/config/local-development.cjs to work on publications
  host: `${devHost}:${nginxPort}`,
  mongoUrl: `mongodb://localhost:${mongoPort}/data-fair-catalogs-development`,
  observer: {
    active: false
  },
  privateDataFairUrl: `http://${devHost}:${nginxPort}/data-fair`,
  privateEventsUrl: `http://localhost:${eventsPort}`,
  privateRegistryUrl: `http://localhost:${registryPort}`,
  secretKeys: {
    events: 'secret-events',
    registry: 'secret-registry-internal'
  },
  upgradeRoot: '../'
}
