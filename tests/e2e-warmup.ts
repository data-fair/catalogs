import { test as setup, expect } from './fixtures/login.ts'
import { axiosAuth, cleanDb } from './support/axios.ts'
import { publishMockPlugin, mockPluginId } from './support/registry.ts'

/**
 * A cold vite transforms each route's modules on its first visit, slower than the e2e timeouts.
 * Dependency discovery is off (`optimizeDeps.noDiscovery` in ui/vite.config.ts: no reload),
 * so this run also fails fast on a commonjs dependency missing from `optimizeDeps.include`
 * (blank page, the module named in the console). This project runs before the e2e ones and
 * visits every UI route once, with a long timeout. Each step's duration is recorded in the
 * test annotations.
 */
setup('warm up the dev UI routes', async ({ page, goToWithAuth }, testInfo) => {
  let last = Date.now()
  const stamp = (step: string) => {
    testInfo.annotations.push({ type: 'warmup', description: `${step}: ${Date.now() - last} ms` })
    last = Date.now()
  }

  await publishMockPlugin()
  await cleanDb()
  const admin = await axiosAuth('test_admin1@test.com')
  const { data: catalog } = await admin.post('/api/catalogs', {
    title: 'Warmup catalog',
    plugin: mockPluginId,
    owner: { type: 'user', id: 'test_admin1', name: 'Test Admin1' },
    config: { url: 'https://data.gouv.fr', delay: 0 }
  })
  const { data: imp } = await admin.post('/api/imports', {
    catalog: { id: catalog._id },
    config: {},
    remoteResource: { id: 'r1', title: 'Warmup resource' },
    scheduling: [],
    shouldUpdateMetadata: true,
    shouldUpdateSchema: true
  })
  stamp('seed a catalog and an import')

  await goToWithAuth('/catalogs/catalogs', 'test_admin1')
  await expect(page.getByText('Warmup catalog')).toBeVisible()
  stamp('catalogs list')

  await goToWithAuth('/catalogs/catalogs/new', 'test_admin1')
  await expect(page.getByText(/Mock/).first()).toBeVisible()
  stamp('new catalog')

  await goToWithAuth(`/catalogs/catalogs/${catalog._id}?tab=configuration`, 'test_admin1')
  await expect(page.getByLabel('URL', { exact: true })).toHaveValue('https://data.gouv.fr')
  stamp('catalog configuration')

  await goToWithAuth(`/catalogs/catalogs/${catalog._id}/imports/new`, 'test_admin1')
  await expect(page.locator('.v-stepper')).toBeVisible()
  stamp('new import')

  await goToWithAuth(`/catalogs/catalogs/${catalog._id}/imports/${imp._id}`, 'test_admin1')
  await expect(page.getByText('Warmup resource').first()).toBeVisible()
  stamp('import page')

  await goToWithAuth(`/catalogs/catalogs/${catalog._id}/publications/new`, 'test_admin1')
  await expect(page.getByLabel(/Jeu de données Data Fair/)).toBeVisible()
  stamp('new publication')

  // a clean reload proves nothing is left to optimize: a pending one would reload the page again
  await goToWithAuth(`/catalogs/catalogs/${catalog._id}?tab=configuration`, 'test_admin1')
  await expect(page.getByLabel('URL', { exact: true })).toHaveValue('https://data.gouv.fr')
  stamp('reload stable')

  await cleanDb()
})
