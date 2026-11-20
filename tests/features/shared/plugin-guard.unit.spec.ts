import { test, expect } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const guardPath = path.resolve(import.meta.dirname, '../../../shared/plugin-guard.ts')

const runScript = (body: string) => {
  const script = `
import { EventEmitter } from 'node:events'
import { guardPlugin, installUncaughtErrorsHandler } from ${JSON.stringify(guardPath)}
installUncaughtErrorsHandler()
const emitLater = () => setTimeout(() => new EventEmitter().emit('error', Object.assign(new Error('read ECONNRESET'), { code: 'ECONNRESET' })), 10)
const plugin = guardPlugin({
  metadata: { title: 'test' },
  async list () { emitLater(); return { count: 0, results: [] } },
  async getResource () { Promise.reject(new Error('forgotten rejection')); return {} }
}, 'test-plugin')
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
