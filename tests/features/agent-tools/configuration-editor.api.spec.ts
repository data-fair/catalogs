import { test, expect } from '../../fixtures/login.ts'
import { load } from '@data-fair/openapi-mcp'
import { axios, axiosAuth, baseURL, cleanDb } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

const owner = { type: 'organization', id: 'test_org1', name: 'Test Org 1' }

test.describe('configuration editor tools', () => {
  test.beforeAll(publishMockPlugin)
  test.beforeEach(cleanDb)
  test.afterAll(cleanDb)

  const setup = async () => {
    const admin = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
    const catalog = (await admin.post('/api/catalogs', { title: 'Editor catalog', plugin: mockPluginId, owner, config: { url: 'https://example.com', delay: 0 } })).data
    const imp = (await admin.post('/api/imports', { catalog: { id: catalog._id }, config: {}, remoteResource: { id: 'r1', title: 'Resource 1' }, scheduling: [], shouldUpdateMetadata: true, shouldUpdateSchema: true })).data
    const doc = (await axios().get('/api/api-docs.json', { headers: { 'Accept-Language': 'en' } })).data
    const toolSet = await load(doc, { baseUrl: `${baseURL}/api`, lint: 'error' })
    const ctx = { headers: { cookie: admin.cookieJar.getCookieStringSync(baseURL) }, identity: 'test_admin1' }
    const call = async (name: string, params: Record<string, unknown>) => {
      const tool = toolSet.tools.find(t => t.name === name)
      if (!tool) throw new Error(`no tool ${name}`)
      const res = await tool.execute(params, ctx)
      if (process.env.DEBUG_EDITOR) console.log(name, JSON.stringify(params), '\n', res.text)
      return res
    }
    return { admin, catalog, imp, call }
  }

  test('the catalog_configuration tools edit and save the configuration of a catalog', async () => {
    const { admin, catalog, call } = await setup()
    const state = await call('catalog_configuration_describeState', { id: catalog._id })
    expect(state.isError).toBeFalsy()
    expect(state.text).toContain('url')
    expect((await call('catalog_configuration_setFieldValue', { id: catalog._id, path: '/title', value: 'Renamed by the agent' })).isError).toBeFalsy()
    const saved = await call('catalog_configuration_saveForm', { id: catalog._id })
    expect(saved.isError, saved.text).toBeFalsy()
    expect((await admin.get(`/api/catalogs/${catalog._id}`)).data.title).toBe('Renamed by the agent')
  })

  test('the import_configuration tools suggest time zones and save the plugin config', async () => {
    const { admin, imp, call } = await setup()
    const state = await call('import_configuration_describeState', { id: imp._id })
    expect(state.isError, state.text).toBeFalsy()
    // a daily scheduling rule, to reach its time zone field
    const added = await call('import_configuration_editArray', { id: imp._id, path: '/scheduling', action: 'add', value: { type: 'daily' } })
    expect(added.isError, added.text).toBeFalsy()
    const timeZonePath = added.text.match(/(\/scheduling\/0\/\S*timeZone)/)?.[1]
    expect(timeZonePath, added.text).toBeTruthy()
    const suggestions = await call('import_configuration_getFieldSuggestions', { id: imp._id, path: timeZonePath })
    expect(suggestions.isError, suggestions.text).toBeFalsy()
    expect(suggestions.text).toContain('Europe/Paris')
    expect((await call('import_configuration_setFieldValue', { id: imp._id, path: '/config/nbRows', value: 20 })).isError).toBeFalsy()
    const saved = await call('import_configuration_saveForm', { id: imp._id })
    expect(saved.isError, saved.text).toBeFalsy()
    expect((await admin.get(`/api/imports/${imp._id}`)).data.config).toMatchObject({ nbRows: 20 })
  })
})
