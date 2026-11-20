import { test, expect } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const guardPath = path.resolve(import.meta.dirname, '../../../shared/plugin-guard.ts')

const runScript = (body: string) => {
  const script = `
import { EventEmitter } from 'node:events'
import { guardPlugin, outsidePlugin, installUncaughtErrorsHandler } from ${JSON.stringify(guardPath)}
installUncaughtErrorsHandler()
const resetError = () => Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' })
const emitLater = () => setTimeout(() => new EventEmitter().emit('error', resetError()), 10)
let sharedConnection
const plugin = guardPlugin({
  metadata: { title: 'test' },
  async list () { emitLater(); return { count: 0, results: [] } },
  async getResource () { Promise.reject(new Error('forgotten rejection')); return {} },
  prepare () { emitLater(); return new Promise(() => {}) },
  publishDataset () { return new Promise(() => {}) },
  async openConnection () {
    sharedConnection = new EventEmitter()
    setTimeout(() => sharedConnection.emit('error', resetError()), 30)
  },
  useConnection () { return new Promise(() => {}) },
  hostCallback (cb) { cb(); return new Promise(() => {}) },
  assertConfigValid () { throw new Error('invalid config') }
}, 'test-plugin', { timeout: 100 })
${body}
setTimeout(() => { console.log('ALIVE'); process.exit(0) }, 200)
`
  return spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'production' } })
}

test.describe('plugin guard', () => {
  test('an error event nobody listens to in a plugin call does not stop the process', () => {
    const res = runScript('await plugin.list({})')
    expect(res.stdout).toContain('ALIVE')
    expect(res.stdout).toContain('"code":"plugin-uncaught-error"')
    expect(res.stdout).toContain('"plugin":"test-plugin"')
    expect(res.status).toBe(0)
  })

  test('an unhandled rejection in a plugin call does not stop the process', () => {
    const res = runScript('await plugin.getResource({})')
    expect(res.stdout).toContain('ALIVE')
    expect(res.stdout).toContain('"origin":"unhandledRejection"')
    expect(res.status).toBe(0)
  })

  test('a pending plugin call rejects with the uncaught error it raised', () => {
    const res = runScript('await plugin.prepare({}).catch(err => console.log("REJECTED=" + err.code))')
    expect(res.stdout).toContain('REJECTED=ECONNRESET')
    expect(res.stdout).toContain('"pluginMethod":"prepare"')
    expect(res.stdout).toContain('ALIVE')
  })

  test('a plugin call that never settles rejects after the timeout', () => {
    const res = runScript('await plugin.publishDataset({}).catch(err => console.log("REJECTED=" + err.status + " " + err.message))')
    expect(res.stdout).toContain('REJECTED=504 the plugin test-plugin did not answer publishDataset in 0.1s')
  })

  test('an error on a resource created by a settled call fails the pending calls of the same plugin', () => {
    const res = runScript(`
await plugin.openConnection()
await plugin.useConnection().catch(err => console.log('REJECTED=' + err.code))`)
    expect(res.stdout).toContain('REJECTED=ECONNRESET')
    expect(res.stdout).toContain('"afterCallSettled":true')
    expect(res.stdout).toContain('ALIVE')
  })

  test('an error from a host callback run outside of the plugin context still stops the process', () => {
    const res = runScript('plugin.hostCallback(() => outsidePlugin(emitLater))')
    expect(res.stdout).not.toContain('ALIVE')
    expect(res.stdout).toContain('"code":"uncaught-error"')
    expect(res.status).toBe(1)
  })

  test('too many uncaught errors in plugins stop the process', () => {
    const res = runScript('for (let i = 0; i < 21; i++) plugin.list({})')
    expect(res.stdout).not.toContain('ALIVE')
    expect(res.stdout).toContain('"code":"plugin-uncaught-errors-limit"')
    expect(res.status).toBe(1)
  })

  test('a synchronous throw is returned unchanged', () => {
    const res = runScript('try { plugin.assertConfigValid({}) } catch (err) { console.log("THROWN=" + err.message) }')
    expect(res.stdout).toContain('THROWN=invalid config')
  })

  test('keeps the plugin metadata', () => {
    const res = runScript('console.log("TITLE=" + plugin.metadata.title)')
    expect(res.stdout).toContain('TITLE=test')
  })

  test('an uncaught error outside of a plugin call still stops the process', () => {
    const res = runScript('emitLater()')
    expect(res.stdout).not.toContain('ALIVE')
    expect(res.stdout).toContain('"code":"uncaught-error"')
    expect(res.status).toBe(1)
  })
})
