import type CatalogPlugin from '@data-fair/types-catalogs'
import { AsyncLocalStorage } from 'node:async_hooks'
import log from '@data-fair/lib-node/log.js'

const pluginStorage = new AsyncLocalStorage<{ plugin: string }>()

export const guardPlugin = (plugin: CatalogPlugin, pluginId: string): CatalogPlugin => {
  const guarded: Record<string, unknown> = { ...plugin }
  for (const [key, value] of Object.entries(plugin) as [string, unknown][]) {
    if (typeof value !== 'function') continue
    guarded[key] = (...args: unknown[]) => pluginStorage.run({ plugin: pluginId }, () => (value as (...args: unknown[]) => unknown).apply(plugin, args))
  }
  return guarded as unknown as CatalogPlugin
}

export const installUncaughtErrorsHandler = () => {
  process.on('uncaughtException', (err, origin) => {
    const pluginContext = pluginStorage.getStore()
    if (pluginContext) {
      log.error('uncaught error in a plugin', { code: 'plugin-uncaught-error', plugin: pluginContext.plugin, origin, err })
      return
    }
    log.error('uncaught error, shutting down', { code: 'uncaught-error', origin, err })
    process.exit(1)
  })
}
