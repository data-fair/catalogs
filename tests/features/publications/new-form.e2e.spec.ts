import { test, expect } from '../../fixtures/login.ts'
import { axiosAuth, cleanDb, cleanPlugins } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

let catalogId: string

test.describe('new publication form', () => {
  test.beforeAll(async () => {
    await cleanPlugins()
    await publishMockPlugin()
  })

  test.beforeEach(async () => {
    await cleanDb()
    const ax = await axiosAuth('test_catalogs_org1_admin@test.com')
    const catalog = await ax.post('/api/catalogs', {
      title: 'Test Catalog',
      plugin: mockPluginId,
      owner: { type: 'user', id: 'test_catalogs_org1_admin', name: 'test_catalogs_org1_admin' },
      config: { url: 'https://data.gouv.fr', delay: 0 }
    })
    catalogId = catalog.data._id
  })

  // the schema now waits for the plugin's i18n messages before it is built, so a plugin that
  // never resolves its overrides must still let the form through rather than hang on an empty step
  test('renders the configuration step', async ({ page, goToWithAuth }) => {
    await goToWithAuth(`/catalogs/catalogs/${catalogId}/publications/new`, 'test_catalogs_org1_admin')
    await expect(page.getByLabel(/Jeu de données Data Fair/)).toBeVisible({ timeout: 15000 })
  })
})
