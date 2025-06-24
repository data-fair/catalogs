export default {
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
    interval: 2 * 1000, // 2 seconds
    inactiveInterval: 10 * 1000, // 10 seconds
    inactivityDelay: 60 * 1000, // 1 minute
    concurrency: 4 // Number of concurrent tasks
  }
}
