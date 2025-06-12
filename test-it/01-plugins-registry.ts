import { strict as assert } from 'node:assert'
import { it, describe, before, after } from 'node:test'
import { axiosAuth, cleanAll, startApiServer, stopApiServer } from './utils/index.ts'

const superadmin = await axiosAuth('superadmin@test.com')
const dmeadusUser = await axiosAuth('dmeadus@answers.com')

describe('plugin-registry', () => {
  before(startApiServer)
  after(cleanAll)
  after(stopApiServer)

  it('should search for plugins (just lastest) on npmjs', async () => {
    const res = await superadmin.get('/api/plugins-registry', { params: { q: 'mock' } })
    const plugin = res.data.results.filter(p => p.name === '@data-fair/catalog-mock')
    assert.equal(plugin.length, 1)
    assert.equal(res.data.results[0].name, '@data-fair/catalog-mock')
  })

  it('should search for plugins without superadmin', async () => {
    await assert.rejects(
      dmeadusUser.get('/api/plugins-registry', { params: { q: 'mock' } }),
      (err: { status: number }) => err.status === 403
    )
  })
})
