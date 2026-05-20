import { test, expect } from '../../fixtures/login.ts'
import { cleanDb } from '../../support/axios.ts'

test.describe('UI layout', () => {
  test.beforeEach(cleanDb)

  test('authenticated admin sees the catalogs list with its empty state', async ({ page, goToWithAuth }) => {
    await goToWithAuth('/catalogs/catalogs', 'test_admin1')
    await expect(page.getByText(/n'avez pas encore créé de catalogue/)).toBeVisible({ timeout: 10000 })
  })
})
