import { test, expect } from '@playwright/test'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { importPluginModule } from '@data-fair/catalogs-shared/plugin-load.ts'

test.describe('importPluginModule', () => {
  test('imports the entry point named by package.json#main', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'plugin-load-test-'))
    try {
      await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0', type: 'module', main: 'entry.js' }))
      await writeFile(path.join(dir, 'entry.js'), 'export default { hello: "world" }')
      const mod = await importPluginModule<{ default: { hello: string } }>(dir)
      expect(mod.default.hello).toBe('world')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('defaults to index.js when package.json has no main', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'plugin-load-test-'))
    try {
      await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0', type: 'module' }))
      await writeFile(path.join(dir, 'index.js'), 'export default { ok: true }')
      const mod = await importPluginModule<{ default: { ok: boolean } }>(dir)
      expect(mod.default.ok).toBe(true)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  test('throws when the entry point file is missing', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'plugin-load-test-'))
    try {
      await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0', type: 'module', main: 'nope.js' }))
      await expect(importPluginModule(dir)).rejects.toThrow(/missing/)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
