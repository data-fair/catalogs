import { test as base, expect } from '@playwright/test'

const devHost = process.env.DEV_HOST ?? 'localhost'
const nginxPort = process.env.NGINX_PORT ?? '5600'
const baseUrl = `http://${devHost}:${nginxPort}`

const cookieCache = new Map<string, Awaited<ReturnType<import('@playwright/test').BrowserContext['cookies']>>>()

async function performLogin (page: any, context: any, url: string, user: string) {
  const fullUrl = `${baseUrl}${url}`
  const password = user === 'test_superadmin' ? 'superpasswd' : 'passwd'
  const loginUrl = `${baseUrl}/simple-directory/login?redirect=${encodeURIComponent(fullUrl)}`
  await page.goto(loginUrl)
  await page.getByLabel('Adresse mail').fill(`${user}@test.com`)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(fullUrl, { timeout: 10000 })
  cookieCache.set(user, await context.cookies())
}

export const test = base.extend<{
  goToWithAuth: (url: string, user: string) => Promise<void>
}>({
      page: async ({ page }, use) => {
        await page.context().addCookies([{
          name: 'i18n_lang',
          value: 'fr',
          url: baseUrl
        }, {
          name: 'cache_bypass',
          value: '1',
          url: baseUrl
        }])
        await use(page)
      },

      goToWithAuth: async ({ page, context }, use) => {
        const goToWithAuth = async (url: string, user: string) => {
          const cached = cookieCache.get(user)
          if (cached) {
            await context.addCookies(cached)
            await page.goto(url)
            if (page.url().includes('/simple-directory/login')) {
              cookieCache.delete(user)
              await performLogin(page, context, url, user)
            }
          } else {
            await performLogin(page, context, url, user)
          }
        }
        await use(goToWithAuth)
      }
    })

export { expect }
