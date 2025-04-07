module.exports = {
  dataDir: './data/test',
  mongoUrl: 'mongodb://localhost:27017/data-fair-catalogs-test',
  observer: {
    port: 9092
  },
  port: 8082,
  privateDatafairUrl: 'http://localhost:8081',
  privateDirectoryUrl: 'http://localhost:8080',
  serveUi: false
}
