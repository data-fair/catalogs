import { createRequire } from 'node:module'
import { ATTR_CODE_NAMESPACE } from '@opentelemetry/semantic-conventions/incubating'

/**
 * pino has to be loaded through require, not `import pino from 'pino'`.
 *
 * @opentelemetry/instrumentation-pino patches the CommonJS export of pino to
 * append an OTLP stream. An ESM default import resolves to the module namespace,
 * which the patch never reaches, so the logs would stay on stdout and never be
 * exported. Verified against @opentelemetry/auto-instrumentations-node 0.82.0.
 */
const pino = createRequire(import.meta.url)('pino') as typeof import('pino')

/**
 * Root logger: one JSON object per line on stdout.
 *
 * `base` is dropped because the collector's k8sattributes processor already
 * attaches pod, node and namespace metadata, and service identity comes from
 * the OTel resource.
 *
 * `isoTime` is not cosmetic. @opentelemetry/instrumentation-pino only knows how
 * to turn the four stdTimeFunctions into a log timestamp; any other function
 * makes it fall back to Date.now() and keep the raw value as an attribute.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: label => ({ level: label })
  }
})

/**
 * Child logger tagged with a module name, replacing the `debug` namespaces.
 * `code.namespace` is the closest semconv key for a logger name.
 */
export const getLogger = (namespace: string) => logger.child({ [ATTR_CODE_NAMESPACE]: namespace })
