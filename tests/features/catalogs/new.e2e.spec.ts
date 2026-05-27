import { test, expect } from '../../fixtures/login.ts'
import { cleanDb } from '../../support/axios.ts'
import { publishMockPlugin } from '../../support/registry.ts'

test.describe('catalog creation picker', () => {
  test.beforeAll(async () => {
    await publishMockPlugin()
  })
  test.beforeEach(cleanDb)

  test('lists catalog plugins from the registry', async ({ page, goToWithAuth }) => {
    await goToWithAuth('/catalogs/catalogs/new', 'test_admin1')
    // The picker card for the mock plugin (registry artefact title "Mock").
    await expect(page.getByText(/Mock/).first()).toBeVisible({ timeout: 10000 })
  })
})
