import { test, expect } from '../../fixtures/login.ts'
import { load } from '@data-fair/openapi-mcp'
import { axios, axiosAuth, baseURL, cleanDb } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

const owner = { type: 'organization', id: 'test_catalogs_org1', name: 'Test Org 1' }

// the paging parameters are integers with numeric defaults: the tools validate their input, defaults included
test.describe('list tools', () => {
  test.beforeAll(publishMockPlugin)
  test.beforeEach(cleanDb)
  test.afterAll(cleanDb)

  test('page with their defaults and with integer size and page', async () => {
    const admin = await axiosAuth({ email: 'test_catalogs_org1_admin@test.com', org: 'test_catalogs_org1' })
    for (const title of ['Catalog 1', 'Catalog 2']) {
      await admin.post('/api/catalogs', { title, plugin: mockPluginId, owner, config: { url: 'https://example.com', delay: 0 } })
    }
    const doc = (await axios().get('/api/api-docs.json', { headers: { 'Accept-Language': 'en' } })).data
    const toolSet = await load(doc, { baseUrl: `${baseURL}/api`, lint: 'error' })
    const ctx = { headers: { cookie: admin.cookieJar.getCookieStringSync(baseURL) }, identity: 'test_catalogs_org1_admin' }
    const call = (name: string, params: Record<string, unknown>) => toolSet.tools.find(t => t.name === name)!.execute(params, ctx)

    for (const name of ['list_catalogs', 'list_imports', 'list_publications']) {
      const res = await call(name, {})
      expect(res.isError, `${name}: ${res.text}`).toBeFalsy()
    }
    const first = await call('list_catalogs', { size: 1 })
    expect(first.isError, first.text).toBeFalsy()
    const second = await call('list_catalogs', { size: 1, page: 2 })
    expect(second.isError, second.text).toBeFalsy()
    expect(first.text).toContain('Catalog')
    expect(second.text).not.toEqual(first.text)
  })
})
