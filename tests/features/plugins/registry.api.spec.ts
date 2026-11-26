import { test, expect } from '../../fixtures/login.ts'
import { axios, axiosAuth } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

const pluginId = mockPluginId
const axAno = axios()

test.describe('plugins resolved from the registry', () => {
  test.beforeAll(async () => {
    await publishMockPlugin()
  })

  test('returns a plugin descriptor with its schemas and metadata', { tag: '@smoke' }, async () => {
    const adminOrg = await axiosAuth({ email: 'test_catalogs_org1_admin@test.com', org: 'test_catalogs_org1' })
    const res = await adminOrg.get('/api/plugins/' + pluginId)
    expect(res.data.id).toBe(pluginId)
    expect(res.data.name).toBe('@data-fair/catalog-mock')
    expect(res.data.version).toBeTruthy()
    expect(res.data.configSchema).toBeTruthy()
    expect(res.data.metadata.capabilities).toBeTruthy()
  })

  test('returns 404 for an unknown plugin', async () => {
    const adminOrg = await axiosAuth({ email: 'test_catalogs_org1_admin@test.com', org: 'test_catalogs_org1' })
    await expect(adminOrg.get('/api/plugins/does-not-exist-0')).rejects.toMatchObject({ status: 404 })
  })

  test('rejects anonymous and non-admin callers', async () => {
    const userOrg = await axiosAuth({ email: 'test_catalogs_org1_user@test.com', org: 'test_catalogs_org1' })
    await expect(axAno.get('/api/plugins/' + pluginId)).rejects.toMatchObject({ status: 401 })
    await expect(userOrg.get('/api/plugins/' + pluginId)).rejects.toMatchObject({ status: 403 })
  })
})
