import { start, stop } from './src/server.ts'
import { getLogger } from '@data-fair/catalogs-shared/logger.ts'

const logger = getLogger('api')

start().then(() => {}, err => {
  logger.error({ err }, 'Failure while starting service')
  process.exit(1)
})

process.on('SIGTERM', function onSigterm () {
  logger.info('Received SIGTERM signal, shutdown gracefully...')
  stop().then(() => {
    logger.info('shutting down now')
    process.exit()
  }, err => {
    logger.error({ err }, 'Failure while stopping service')
    process.exit(1)
  })
})
