import { test, expect } from '../../fixtures/login.ts'
import { axiosAuth, cleanDb } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

const owner = { type: 'user', id: 'test_catalogs_org1_admin', name: 'Test Admin1' }

test.describe('dataset publications', () => {
  test.beforeAll(publishMockPlugin)
  test.beforeEach(cleanDb)
  test.afterAll(cleanDb)

  test('the catalog choice waits for the catalog list, then builds the creation link', async ({ page, goToWithAuth }) => {
    const admin = await axiosAuth('test_catalogs_org1_admin@test.com')
    const catalogs = []
    for (const title of ['Catalog A', 'Catalog B']) {
      catalogs.push((await admin.post('/api/catalogs', { title, plugin: mockPluginId, owner, config: { url: 'https://data.gouv.fr', delay: 0, publicationMode: 'full' } })).data)
    }

    // hold the catalog list: the page must not claim there is no catalog while it loads
    let release!: () => void
    const released = new Promise<void>(resolve => { release = resolve })
    await page.route('**/catalogs/api/catalogs?*', async route => {
      await released
      await route.continue()
    })
    await goToWithAuth('/catalogs/dataset-publications?dataset-id=dataset1', 'test_catalogs_org1_admin')
    await expect(page.getByRole('progressbar')).toBeVisible()
    await expect(page.getByText('Vous n\'avez pas encore configuré de catalogue')).toHaveCount(0)
    release()

    await page.getByRole('combobox', { name: 'Sélectionner un catalogue' }).click()
    await page.getByRole('option', { name: 'Catalog B' }).click()
    await expect(page.getByRole('link', { name: 'Créer une nouvelle publication' }))
      .toHaveAttribute('href', `/data-fair/catalogs/${catalogs[1]._id}/publications/new?datasetId=dataset1`)
  })
})
