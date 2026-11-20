import type CatalogPlugin from '@data-fair/types-catalogs'
import { AsyncLocalStorage } from 'node:async_hooks'
import log from '@data-fair/lib-node/log.js'

type PluginCall = { plugin: string, method: string, settled: boolean, fail: (err: unknown) => void }

const pluginStorage = new AsyncLocalStorage<PluginCall>()
const pendingCalls = new Set<PluginCall>()

const maxPluginErrors = 10
const pluginErrorsWindow = 10 * 60 * 1000
const pluginErrorDates = new Map<string, number[]>()

const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  typeof (value as PromiseLike<unknown> | null)?.then === 'function'

const callPlugin = (plugin: string, method: string, timeout: number | undefined, run: () => unknown) => {
  let fail: (err: unknown) => void = () => {}
  const failed = new Promise<never>((_resolve, reject) => { fail = reject })
  failed.catch(() => {})
  const call: PluginCall = { plugin, method, settled: false, fail }
  const settle = () => {
    call.settled = true
    pendingCalls.delete(call)
  }

  pendingCalls.add(call)
  let result: unknown
  try {
    result = pluginStorage.run(call, run)
  } catch (err) {
    settle()
    throw err
  }
  if (!isThenable(result)) {
    settle()
    return result
  }

  const timer = timeout
    ? setTimeout(() => {
      log.warn('a plugin call timed out', { code: 'plugin-call-timeout', plugin, pluginMethod: method, timeout })
      fail(Object.assign(new Error(`the plugin ${plugin} did not answer ${method} in ${timeout / 1000}s`), { status: 504, expose: true }))
    }, timeout)
    : undefined
  return Promise.race([result, failed]).finally(() => {
    clearTimeout(timer)
    settle()
  })
}

export const guardPlugin = (plugin: CatalogPlugin, pluginId: string, opts: { timeout?: number } = {}): CatalogPlugin => {
  const guarded: Record<string, unknown> = { ...plugin }
  for (const [key, value] of Object.entries(plugin) as [string, unknown][]) {
    if (typeof value !== 'function') continue
    guarded[key] = (...args: unknown[]) => callPlugin(pluginId, key, opts.timeout, () => (value as (...args: unknown[]) => unknown).apply(plugin, args))
  }
  return guarded as unknown as CatalogPlugin
}

export const outsidePlugin = <T>(fn: () => T): T => pluginStorage.exit(fn)

export const installUncaughtErrorsHandler = () => {
  process.on('uncaughtException', (err, origin) => {
    const call = pluginStorage.getStore()
    if (!call) {
      log.error('uncaught error, shutting down', { code: 'uncaught-error', origin, err })
      process.exit(1)
    }

    const failedCalls = call.settled ? [...pendingCalls].filter(c => c.plugin === call.plugin) : [call]
    log.error('uncaught error in a plugin', {
      code: 'plugin-uncaught-error',
      plugin: call.plugin,
      pluginMethod: call.method,
      afterCallSettled: call.settled,
      failedCalls: failedCalls.length,
      origin,
      err
    })
    for (const failedCall of failedCalls) failedCall.fail(err)

    const now = Date.now()
    const dates = [...(pluginErrorDates.get(call.plugin) ?? []).filter(date => date > now - pluginErrorsWindow), now]
    pluginErrorDates.set(call.plugin, dates)
    if (dates.length >= maxPluginErrors) {
      log.error('too many uncaught errors in a plugin, shutting down', { code: 'plugin-uncaught-errors-limit', plugin: call.plugin, count: dates.length })
      process.exit(1)
    }
  })
}
