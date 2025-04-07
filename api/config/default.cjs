module.exports = {
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
  privateDatafairUrl: 'http://data-fair:8080',
  privateDirectoryUrl: 'http://simple-directory:8080',
  privateEventsUrl: null,
  secretKeys: {
    events: null
  },
  serveUi: true,
  tmpDir: null,
}
