import { test, expect } from '../../fixtures/login.ts'
import { axiosAuth, cleanDb } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

/**
 * The catalog configuration tab renders one vjsf form with the catalog title and
 * description plus the plugin config. The plugin descriptor (and its config
 * schema) is fetched after the catalog: the form must not be mounted on the
 * intermediate schema, otherwise vjsf re-instantiates its state on the final
 * schema while the title/description fields keep writing into the stale one, and
 * typing in either makes the plugin config section vanish.
 */
test.describe('catalog configuration edition', () => {
  test.beforeAll(async () => {
    await publishMockPlugin()
  })
  test.beforeEach(cleanDb)

  test('keeps the plugin config visible while editing the title and description', async ({ page, goToWithAuth }) => {
    const admin = await axiosAuth('test_admin1@test.com')
    const { data: catalog } = await admin.post('/api/catalogs', {
      title: 'Config edit catalog',
      plugin: mockPluginId,
      owner: { type: 'user', id: 'test_admin1', name: 'Test Admin1' },
      config: { url: 'https://data.gouv.fr', delay: 0 }
    })

    await goToWithAuth(`/catalogs/catalogs/${catalog._id}?tab=configuration`, 'test_admin1')

    const title = page.getByLabel('Titre')
    const description = page.getByLabel('Description')
    const configUrl = page.getByLabel('URL', { exact: true })
    await expect(configUrl).toHaveValue('https://data.gouv.fr')

    await title.fill('Config edit catalog edited')
    await expect(title).toHaveValue('Config edit catalog edited')
    await expect(configUrl).toHaveValue('https://data.gouv.fr')

    await description.fill('some description')
    await expect(description).toHaveValue('some description')
    await expect(configUrl).toHaveValue('https://data.gouv.fr')

    // the edits reach the API together with the untouched plugin config
    await page.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(page.getByText('Configuration enregistrée')).toBeVisible()
    const { data: saved } = await admin.get(`/api/catalogs/${catalog._id}`)
    expect(saved.title).toBe('Config edit catalog edited')
    expect(saved.description).toBe('some description')
    expect(saved.config.url).toBe('https://data.gouv.fr')
  })
})
