import type { Page } from '@playwright/test'
import { test, expect } from '../../fixtures/login.ts'
import { axiosAuth, cleanDb } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

/**
 * The catalogs UI fetches plugin thumbnails straight from the registry. These
 * tests guard the registry URL the UI builds: the public thumbnail endpoint is
 * /registry/api/v1/thumbnails/:thumbnailId/data. A request that 404s ("unknown
 * api endpoint") means the UI is pointing at the wrong registry endpoint.
 */
test.describe('catalog plugin thumbnails from the registry', () => {
  test.beforeAll(async () => {
    await publishMockPlugin()
  })
  test.beforeEach(cleanDb)

  // Resolves on the first request to the registry's public thumbnail endpoint.
  const waitForThumbnail = (page: Page) =>
    page.waitForResponse(r => r.url().includes('/registry/api/v1/thumbnails/'), { timeout: 10000 })

  test('the plugin picker fetches the thumbnail', async ({ page, goToWithAuth }) => {
    const thumbnail = waitForThumbnail(page)
    await goToWithAuth('/catalogs/catalogs/new', 'test_admin1')
    expect((await thumbnail).status()).toBe(200)
  })

  test('the catalog card and detail page fetch the thumbnail', async ({ page, goToWithAuth }) => {
    // Catalog owned by the test_admin1 personal account — the account the
    // browser session uses after login.
    const admin = await axiosAuth('test_admin1@test.com')
    const { data: catalog } = await admin.post('/api/catalogs', {
      title: 'Thumbnail catalog',
      plugin: mockPluginId,
      owner: { type: 'user', id: 'test_admin1', name: 'Test Admin1' },
      config: { url: 'https://data.gouv.fr', delay: 0 }
    })

    // Catalog list — the card renders the registry-hosted plugin thumbnail.
    const cardThumbnail = waitForThumbnail(page)
    await goToWithAuth('/catalogs/catalogs', 'test_admin1')
    expect((await cardThumbnail).status()).toBe(200)

    // Catalog detail page — same thumbnail in the section header.
    const detailThumbnail = waitForThumbnail(page)
    await goToWithAuth(`/catalogs/catalogs/${catalog._id}`, 'test_admin1')
    expect((await detailThumbnail).status()).toBe(200)
  })
})
