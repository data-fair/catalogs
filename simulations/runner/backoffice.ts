// Adapted from portals' simulations/runner/surfaces.ts (its back-office surface).
import { expect, type Locator, type Page } from '@playwright/test'
import type { SeedIds } from './fixtures.ts'
import { OWNER, OWNER_ADMIN_EMAIL } from './settings.ts'

const ROOT = `http://${process.env.DEV_HOST}:${process.env.NGINX_PORT}`
/** The agents chat frame, whose src is /agents/<type>/<id>/chat?… — not a bare 'iframe': the shell embeds the catalogs UI too. */
export const CHAT_FRAME = 'iframe[src*="/agents/"][src*="/chat"]'

export function resolveRoute (route: string, ids: SeedIds) {
  return route.replaceAll('{catalogId}', ids.catalogId)
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

/**
 * The drawer does not survive a full navigation, and the persona may close it.
 * Reopening before every send keeps the run alive so the friction reaches the
 * transcript instead of killing it. Probe first: clicking unconditionally would
 * close a drawer that is already open.
 */
export async function ensureChatOpen (page: Page, composer: Locator) {
  const visible = (timeout: number) => composer.waitFor({ state: 'visible', timeout }).then(() => true, () => false)
  // 10s, not 2: right after a navigation the open drawer's iframe is still reloading,
  // and a short probe read it as closed — the click then CLOSED the drawer (portals).
  if (await visible(10_000)) return
  const toggle = page.locator('.df-agent-chat-toggle').first()
  await toggle.click()
  if (await visible(15_000)) return
  // Still nothing: the probe raced a drawer that was open after all. One more toggle.
  await toggle.click()
  await composer.waitFor({ state: 'visible', timeout: 30_000 })
}
