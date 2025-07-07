export default {
  cipherPassword: 'dev',
  dataDir: '../data/development',
  host: 'localhost:5600',
  mongoUrl: 'mongodb://localhost:27017/data-fair-catalogs-development',
  observer: {
    active: false,
  },
  privateDataFairUrl: 'http://localhost:5600/data-fair',
  privateEventsUrl: 'http://localhost:8088',
  secretKeys: {
    events: 'secret-events'
  },
  upgradeRoot: '../'
}
