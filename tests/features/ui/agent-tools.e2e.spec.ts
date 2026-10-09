import type { Page } from '@playwright/test'
import { test, expect } from '../../fixtures/login.ts'
import { axiosAuth, cleanDb } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

const waitForTools = (page: Page, names: string[]) => page.waitForFunction((names) => {
  const mc = (navigator as any).modelContext
  if (!mc || typeof mc.listTools !== 'function') return false
  const registered = mc.listTools().map((t: any) => t.name)
  return names.every(name => registered.includes(name))
}, names, { timeout: 30_000 })

// what the chat sees right after a tool call returns
const registeredTools = (page: Page) => page.evaluate(() => (navigator as any).modelContext.listTools().map((t: any) => t.name) as string[])

const callTool = async (page: Page, name: string, args: Record<string, unknown> = {}) => {
  const result: any = await page.evaluate(({ name, args }) => (navigator as any).modelContext.callTool({ name, arguments: args }), { name, args })
  return { text: result?.content?.[0]?.text as string, isError: !!result?.isError }
}

const createCatalog = async () => {
  const admin = await axiosAuth('test_admin1@test.com')
  return (await admin.post('/api/catalogs', {
    title: 'Agent catalog',
    plugin: mockPluginId,
    owner: { type: 'user', id: 'test_admin1', name: 'Test Admin1' },
    config: { url: 'https://data.gouv.fr', delay: 0 }
  })).data
}

test.describe('agent tools', () => {
  test.beforeAll(async () => {
    await publishMockPlugin()
  })
  test.beforeEach(cleanDb)

  test('the catalog configuration form is editable by the assistant', async ({ page, goToWithAuth }) => {
    const catalog = await createCatalog()
    await goToWithAuth(`/catalogs/catalogs/${catalog._id}`, 'test_admin1')

    await waitForTools(page, ['open_page_tab'])
    expect((await callTool(page, 'open_page_tab', { tab: 'configuration' })).isError).toBe(false)
    expect(await registeredTools(page)).toEqual(expect.arrayContaining(['catalogConfig_describeState', 'catalogConfig_setFieldValue']))

    const state = (await callTool(page, 'catalogConfig_describeState')).text
    const titlePath = state.match(/(\/[^\s`"]*title)\b/)?.[1]
    expect(titlePath).toBeTruthy()
    expect((await callTool(page, 'catalogConfig_setFieldValue', { path: titlePath, value: 'Renamed by the assistant' })).isError).toBe(false)
    await expect(page.getByLabel('Titre')).toHaveValue('Renamed by the assistant')
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeVisible()
  })

  test('the import wizard can be driven up to its configuration step', async ({ page, goToWithAuth }) => {
    const catalog = await createCatalog()
    await goToWithAuth(`/catalogs/catalogs/${catalog._id}`, 'test_admin1')

    await waitForTools(page, ['open_catalog_wizard'])
    const opened = await callTool(page, 'open_catalog_wizard', { wizard: 'import' })
    expect(opened.isError, opened.text).toBe(false)
    expect(await registeredTools(page)).toEqual(expect.arrayContaining(['browse_remote_resources', 'select_remote_resource', 'wizard_go_to_step']))
    expect((await callTool(page, 'wizard_go_to_step', { step: '2' })).isError).toBe(true)

    const root = (await callTool(page, 'browse_remote_resources')).text
    const folderId = root.match(/\[folder\] Données Démographiques \(id: `([^`]+)`\)/)?.[1]
    expect(folderId).toBeTruthy()

    const folder = (await callTool(page, 'browse_remote_resources', { folderId })).text
    const resourceId = folder.match(/\[resource\] .* \(id: `([^`]+)`\)/)?.[1]
    expect(resourceId).toBeTruthy()

    expect((await callTool(page, 'select_remote_resource', { id: resourceId })).isError).toBe(false)
    expect((await callTool(page, 'wizard_go_to_step', { step: '2' })).isError).toBe(false)
    expect(await registeredTools(page)).toContain('importConfig_describeState')
  })

  test('the imports of a catalog can be listed and opened', async ({ page, goToWithAuth }) => {
    const catalog = await createCatalog()
    const admin = await axiosAuth('test_admin1@test.com')
    const { data: imp } = await admin.post('/api/imports', { catalog: { id: catalog._id }, config: {}, remoteResource: { id: 'r1', title: 'Listed resource' }, scheduling: [], shouldUpdateMetadata: true, shouldUpdateSchema: true })
    await goToWithAuth(`/catalogs/catalogs/${catalog._id}`, 'test_admin1')

    await waitForTools(page, ['list_catalog_items', 'open_catalog_item'])
    expect((await callTool(page, 'list_catalog_items', { kind: 'import' })).text).toContain(`Listed resource (id: \`${imp._id}\`)`)
    expect((await callTool(page, 'open_catalog_item', { kind: 'import', id: imp._id })).isError).toBe(false)
    await expect(page).toHaveURL(new RegExp(`/imports/${imp._id}`))
    expect((await callTool(page, 'search_remote_catalog')).text).toContain('[folder] Données Démographiques')
  })

  test('the catalog creation wizard lets the assistant pick the catalog type', async ({ page, goToWithAuth }) => {
    await goToWithAuth('/catalogs/catalogs/new', 'test_admin1')

    await waitForTools(page, ['list_catalog_plugins', 'select_catalog_plugin'])
    expect((await callTool(page, 'list_catalog_plugins')).text).toContain(mockPluginId)
    expect((await callTool(page, 'select_catalog_plugin', { plugin: mockPluginId })).isError).toBe(false)
    expect(await registeredTools(page)).toContain('catalogConfig_describeState')
  })
})
