export default {
  cipherPassword: 'test',
  dataDir: './data/test',
  mongoUrl: 'mongodb://localhost:27017/data-fair-catalogs-test',
  observer: {
    active: false
  },
  privateEventsUrl: 'http://localhost:8088',
  secretKeys: {
    events: 'secret-events'
  },
  worker: {
    interval: 100,
    killInterval: 2000,
    concurrency: 1,
    gracePeriod: 3000
  },
  upgradeRoot: './'
}
