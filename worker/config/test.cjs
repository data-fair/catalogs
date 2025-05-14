module.exports = {
  dataDir: './data/test',
  mongoUrl: 'mongodb://localhost:27017/data-fair-catalogs-test',
  observer: {
    active: false
  },
  worker: {
    interval: 100,
    killInterval: 2000,
    concurrency: 1,
    gracePeriod: 3000
  },
  upgradeRoot: './'
}
