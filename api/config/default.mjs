export default {
  cipherPassword: undefined,
  dataDir: null,
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
  privateRegistryUrl: 'http://registry:8080',
  secretKeys: {
    catalogs: undefined,
    events: undefined,
    identities: undefined,
    registry: undefined
  },
  tmpDir: undefined,
}
