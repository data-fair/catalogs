import { start, stop } from './src/worker.ts'
import { getLogger } from '@data-fair/catalogs-shared/logger.ts'

const logger = getLogger('worker')

start().then(() => {}, err => {
  logger.error({ err }, 'Failure while starting worker')
  process.exit(1)
})

process.on('SIGTERM', function onSigterm () {
  logger.info('Received SIGTERM signal, shutdown gracefully...')
  stop().then(() => {
    logger.info('shutting down now')
    process.exit()
  }, err => {
    logger.error({ err }, 'Failure while stopping worker')
    process.exit(1)
  })
})
