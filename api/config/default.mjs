export default {
  cipherPassword: undefined,
  dataDir: '/app/data',
  mongoUrl: 'mongodb://localhost:27017/data-fair-catalogs',
  npm: {
    httpsProxy: null
  },
  observer: {
    active: true,
    port: 9090
  },
  port: 8080,
  privateDirectoryUrl: 'http://simple-directory:8080',
  privateEventsUrl: undefined,
  secretKeys: {
    catalogs: undefined,
    events: undefined,
    identities: undefined
  },
  tmpDir: undefined,
}
