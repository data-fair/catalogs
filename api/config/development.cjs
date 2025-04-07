module.exports = {
  dataDir: '../data/development',
  mongoUrl: 'mongodb://localhost:27017/data-fair-catalogs-development',
  observer: {
    port: 9092
  },
  port: 8082,
  privateDatafairUrl: 'http://localhost:8081',
  privateDirectoryUrl: 'http://localhost:8080',
  privateEventsUrl: 'http://localhost:8088',
  secretKeys: {
    events: 'secret-events'
  },
  serveUi: false
}
