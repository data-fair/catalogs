import { expect, type Page } from '@playwright/test'
import type { SeedIds } from './fixtures.ts'
import { OWNER, OWNER_ADMIN_EMAIL, ROOT } from './settings.ts'

export function resolveRoute (route: string, ids: SeedIds) {
  return route.replaceAll('{catalogId}', ids.catalogId).replaceAll('{failedImportId}', ids.failedImportId)
}

/** simple-directory keeps the active organization from the login's `org` parameter. */
export async function login (page: Page, target: string) {
  await page.goto(`${ROOT}/simple-directory/login?redirect=${encodeURIComponent(target)}&org=${OWNER.id}`)
  await page.getByLabel('Adresse mail').fill(OWNER_ADMIN_EMAIL)
  await page.getByRole('textbox', { name: 'Mot de passe' }).fill('passwd')
  await expect(page.getByRole('button', { name: 'Se connecter' })).toBeEnabled()
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(url => url.toString().startsWith(target), { timeout: 30_000 })
}
