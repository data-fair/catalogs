export default {
  cipherPassword: 'test',
  dataDir: './data/test',
  mongoUrl: 'mongodb://localhost:27017/data-fair-catalogs-test',
  observer: {
    active: false,
  },
  port: 8082,
  privateDirectoryUrl: 'http://localhost:8080',
  privateEventsUrl: 'http://localhost:8088',
  secretKeys: {
    catalogs: 'secret-catalogs',
    events: 'secret-events',
    identities: 'secret-identities'
  }
}
