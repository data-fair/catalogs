export default {
  cipherPassword: 'test',
  dataDir: './data/test',
  mongoUrl: 'mongodb://localhost:27017/data-fair-catalogs-test',
  observer: {
    active: false,
  },
  port: 8082,
  privateDirectoryUrl: 'http://localhost:8080',
  secretKeys: {
    catalogs: 'secret-catalogs',
    identities: 'secret-identities',
    events: 'secret-events'
  },
  serveUi: false
}
