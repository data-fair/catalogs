import { test, expect } from '@playwright/test'
import { axiosAuth, cleanDb } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

const owner = { type: 'organization', id: 'test_org1', name: 'Test Org 1' }

test.describe('catalogs list', () => {
  test.beforeAll(publishMockPlugin)
  test.beforeEach(cleanDb)

  test('pages with page and size, and searches titles and descriptions with q', async () => {
    const admin = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
    for (const title of ['Catalogue régional', 'Catalogue national', 'Portail des transports']) {
      await admin.post('/api/catalogs', { title, plugin: mockPluginId, owner, config: { url: 'https://data.gouv.fr', delay: 0 } })
    }

    const page2 = (await admin.get('/api/catalogs', { params: { size: 2, page: 2, sort: 'title:1' } })).data
    expect(page2.count).toBe(3)
    expect(page2.results.map((c: any) => c.title)).toEqual(['Portail des transports'])

    const found = (await admin.get('/api/catalogs', { params: { q: 'transports' } })).data
    expect(found.results.map((c: any) => c.title)).toEqual(['Portail des transports'])
  })
})
