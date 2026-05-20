const apiPort = parseInt(process.env.DEV_API_PORT ?? '8082')
const mongoPort = process.env.MONGO_PORT ?? '27017'
const sdPort = process.env.SD_PORT ?? '8080'
const eventsPort = process.env.EVENTS_PORT ?? '8088'

export default {
  cipherPassword: 'dev',
  dataDir: '../data/development',
  mongoUrl: `mongodb://localhost:${mongoPort}/data-fair-catalogs-development`,
  observer: {
    active: false
  },
  port: apiPort,
  privateDirectoryUrl: `http://localhost:${sdPort}`,
  privateEventsUrl: `http://localhost:${eventsPort}`,
  secretKeys: {
    catalogs: 'secret-catalogs',
    events: 'secret-events',
    identities: 'secret-identities'
  }
}
