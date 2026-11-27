import { test, expect } from '../../fixtures/login.ts'
import { axiosAuth, cleanDb } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId, setMockPluginDeprecated } from '../../support/registry.ts'

// A deprecated plugin keeps its catalogs working: the list must show its title, not "Supprimé" (the registry hides
// deprecated artefacts from its list unless asked), while the creation page no longer offers it.
test.describe('catalogs on a deprecated plugin', () => {
  test.beforeAll(publishMockPlugin)
  test.beforeEach(cleanDb)
  test.afterEach(() => setMockPluginDeprecated(false))

  test('the list keeps the plugin, the picker no longer offers it', async ({ page, goToWithAuth }) => {
    const admin = await axiosAuth('test_catalogs_org1_admin@test.com')
    await admin.post('/api/catalogs', {
      title: 'Deprecated plugin catalog',
      plugin: mockPluginId,
      owner: { type: 'user', id: 'test_catalogs_org1_admin', name: 'Test Admin1' },
      config: { url: 'https://data.gouv.fr', delay: 0 }
    })
    await setMockPluginDeprecated(true)

    await goToWithAuth('/catalogs/catalogs', 'test_catalogs_org1_admin')
    await expect(page.getByText('Deprecated plugin catalog')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Supprimé -/)).toHaveCount(0)
    await expect(page.getByText(/Mock/).first()).toBeVisible()

    await goToWithAuth('/catalogs/catalogs/new', 'test_catalogs_org1_admin')
    await expect(page.getByText(/Mock/)).toHaveCount(0, { timeout: 10_000 })
  })
})
