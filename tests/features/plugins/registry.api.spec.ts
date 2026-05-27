import { test, expect } from '@playwright/test'
import { axios, axiosAuth } from '../../support/axios.ts'
import { publishMockPlugin } from '../../support/registry.ts'

const pluginId = '@data-fair-catalog-mock-0'
const axAno = axios()

test.describe('plugins resolved from the registry', () => {
  test.beforeAll(async () => {
    await publishMockPlugin()
  })

  test('returns a plugin descriptor with its schemas and metadata', async () => {
    const adminOrg = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
    const res = await adminOrg.get('/api/plugins/' + pluginId)
    expect(res.data.id).toBe(pluginId)
    expect(res.data.name).toBe('@data-fair/catalog-mock')
    expect(res.data.version).toBeTruthy()
    expect(res.data.configSchema).toBeTruthy()
    expect(res.data.metadata.capabilities).toBeTruthy()
  })

  test('returns 404 for an unknown plugin', async () => {
    const adminOrg = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
    await expect(adminOrg.get('/api/plugins/does-not-exist-0')).rejects.toMatchObject({ status: 404 })
  })

  test('rejects anonymous and non-admin callers', async () => {
    const userOrg = await axiosAuth({ email: 'test_user1@test.com', org: 'test_org1' })
    await expect(axAno.get('/api/plugins/' + pluginId)).rejects.toMatchObject({ status: 401 })
    await expect(userOrg.get('/api/plugins/' + pluginId)).rejects.toMatchObject({ status: 403 })
  })
})
