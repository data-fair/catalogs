module.exports = {
  dataDir: '/app/data',
  dataFairAPIKey: undefined,
  host: undefined,
  privateDataFairUrl: undefined,
  mongoUrl: 'mongodb://localhost:27017/data-fair-catalogs',
  observer: {
    active: true,
    port: 9090
  },
  tmpDir: null,
  upgradeRoot: '/app/',
  worker: {
    interval: 2000,
    inactiveInterval: 10000,
    inactivityDelay: 60000,
    concurrency: 4
  }
}
