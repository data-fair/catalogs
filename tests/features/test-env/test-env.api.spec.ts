import { test, expect } from '../../fixtures/login.ts'
import { anonymousAx, cleanDb } from '../../support/axios.ts'

const status = { validateStatus: () => true }

// through nginx, like the world loader of a dev environment of several services, which cleans each one
test.describe('test-env clean', () => {
  test('the clean needs a valid test prefix', async () => {
    expect((await anonymousAx.delete('/api/test-env', status)).status).toBe(400)
    for (const prefix of ['', 'test', 'test_', 'test_catalogs', 'other_x_', 'test_.*_']) {
      expect((await anonymousAx.delete('/api/test-env', { ...status, params: { prefix } })).status, prefix).toBe(400)
    }
  })

  test('the clean of a prefix removes what its accounts own, and only that', async () => {
    // three nested sub-spaces of the suite's own: their accounts need not exist in simple-directory
    const subSpaces = ['test_catalogs_cleana_', 'test_catalogs_cleanb_', 'test_catalogs_cleanz_']
    const owned = (sub: string) => [
      ['catalogs', `${sub}catalog`],
      ['imports', `${sub}import`],
      ['publications', `${sub}publication`],
      ['locks', `import:${sub}import`],
      ['locks', `publication:${sub}publication`]
    ]
    const count = async (sub: string) => {
      let n = 0
      for (const [collection, id] of owned(sub)) {
        if ((await anonymousAx.get(`/api/test-env/docs/${collection}/${encodeURIComponent(id)}`, status)).status === 200) n++
      }
      return n
    }
    try {
      for (const sub of subSpaces) {
        const owner = { type: 'user', id: `${sub}user`, name: 'Clean test' }
        const catalog = { id: `${sub}catalog`, title: 'Clean test' }
        await anonymousAx.post('/api/test-env/docs/catalogs', { _id: `${sub}catalog`, title: 'Clean test', owner })
        await anonymousAx.post('/api/test-env/docs/imports', { _id: `${sub}import`, status: 'done', catalog, owner })
        await anonymousAx.post('/api/test-env/docs/publications', { _id: `${sub}publication`, status: 'done', catalog, owner })
        await anonymousAx.post('/api/test-env/docs/locks', { _id: `import:${sub}import`, owner: 'clean-test' })
        await anonymousAx.post('/api/test-env/docs/locks', { _id: `publication:${sub}publication`, owner: 'clean-test' })
        expect(await count(sub)).toBe(5)
      }

      expect((await anonymousAx.delete('/api/test-env', { ...status, params: { prefix: 'test_catalogs_cleana_' } })).status).toBe(204)
      expect(await count('test_catalogs_cleana_')).toBe(0)
      expect(await count('test_catalogs_cleanb_')).toBe(5)
      expect(await count('test_catalogs_cleanz_')).toBe(5)

      expect((await anonymousAx.delete('/api/test-env', { ...status, params: { prefix: 'test_catalogs_cleanb_' } })).status).toBe(204)
      expect(await count('test_catalogs_cleanb_')).toBe(0)
      expect(await count('test_catalogs_cleanz_')).toBe(5)
    } finally {
      // the suite's own clean covers the three
      await cleanDb()
    }
    for (const sub of subSpaces) expect(await count(sub)).toBe(0)
  })
})
