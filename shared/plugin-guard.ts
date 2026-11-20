import type CatalogPlugin from '@data-fair/types-catalogs'
import { AsyncLocalStorage } from 'node:async_hooks'
import log from '@data-fair/lib-node/log.js'

type PluginCallContext = { plugin: string, method: string, fail: (err: unknown) => void }

const pluginStorage = new AsyncLocalStorage<PluginCallContext>()

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | null)?.then === 'function'

const callPlugin = (plugin: string, method: string, timeout: number | undefined, call: () => unknown) => {
  let fail: (err: unknown) => void = () => {}
  const failed = new Promise<never>((_resolve, reject) => { fail = reject })
  failed.catch(() => {})
  const result = pluginStorage.run({ plugin, method, fail }, call)
  if (!isThenable(result)) return result

  const timer = timeout
    ? setTimeout(() => fail(Object.assign(new Error(`the plugin ${plugin} did not answer ${method} in ${timeout / 1000}s`), { status: 504, expose: true })), timeout)
    : undefined
  return Promise.race([result, failed]).finally(() => clearTimeout(timer))
}

export const guardPlugin = (plugin: CatalogPlugin, pluginId: string, opts: { timeout?: number } = {}): CatalogPlugin => {
  const guarded: Record<string, unknown> = { ...plugin }
  for (const [key, value] of Object.entries(plugin) as [string, unknown][]) {
    if (typeof value !== 'function') continue
    guarded[key] = (...args: unknown[]) => callPlugin(pluginId, key, opts.timeout, () => (value as (...args: unknown[]) => unknown).apply(plugin, args))
  }
  return guarded as unknown as CatalogPlugin
}

export const installUncaughtErrorsHandler = () => {
  process.on('uncaughtException', (err, origin) => {
    const pluginCall = pluginStorage.getStore()
    if (pluginCall) {
      log.error('uncaught error in a plugin', { code: 'plugin-uncaught-error', plugin: pluginCall.plugin, pluginMethod: pluginCall.method, origin, err })
      pluginCall.fail(err)
      return
    }
    log.error('uncaught error, shutting down', { code: 'uncaught-error', origin, err })
    process.exit(1)
  })
}
