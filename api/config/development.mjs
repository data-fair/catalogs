export default {
  cipherPassword: 'dev',
  dataDir: '../data/development',
  mongoUrl: 'mongodb://localhost:27017/data-fair-catalogs-development',
  observer: {
    active: false
  },
  port: 8082,
  privateDirectoryUrl: 'http://localhost:8080',
  privateEventsUrl: 'http://localhost:8088',
  secretKeys: {
    catalogs: 'secret-catalogs',
    identities: 'secret-identities',
    events: 'secret-events'
  },
  serveUi: false
}
