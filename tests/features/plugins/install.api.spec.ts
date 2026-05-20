import fs from 'node:fs'
import path from 'node:path'
import FormData from 'form-data'
import { test, expect } from '@playwright/test'
import { axios, axiosAuth, cleanDb, cleanPlugins } from '../../support/axios.ts'

const axAno = axios()

// Mock project: https://github.com/data-fair/catalog-mock
const plugin = {
  name: '@data-fair/catalog-mock',
  version: '0.4.0'
}
const pluginId = '@data-fair-catalog-mock-0'

test.describe('plugin', () => {
  test.beforeAll(async () => {
    await cleanPlugins()
    await cleanDb()
  })
  test.afterAll(async () => {
    await cleanPlugins()
    await cleanDb()
  })

  test('should install a plugin from npm', async () => {
    const superadmin = await axiosAuth('test_superadmin@test.com')
    const adminOrg = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })

    const res = await superadmin.post('/api/plugins', {
      name: plugin.name,
      version: '0.1.1' // previous version to test update
    })
    expect(res.data.name).toBe(plugin.name)
    expect(res.data.id).toBe(pluginId)
    expect(res.data.version).toBe('0.1.1')

    // only superadmin can install plugins
    await expect(adminOrg.post('/api/plugins')).rejects.toMatchObject({ status: 403 })
  })

  test('should install a plugin from tarball', async () => {
    const superadmin = await axiosAuth('test_superadmin@test.com')
    const adminOrg = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })

    const tarballPath = path.join(import.meta.dirname, '..', '..', 'fixtures', 'catalog-mock.tgz')
    const formData = new FormData()
    formData.append('file', fs.createReadStream(tarballPath))

    const res = await superadmin.post('/api/plugins', formData, { headers: formData.getHeaders() })
    expect(res.data.name).toBe(plugin.name)
    expect(res.data.id).toBe(pluginId)
    expect(res.data.version).toBe('0.4.0')

    await expect(adminOrg.post('/api/plugins')).rejects.toMatchObject({ status: 403 })
  })

  test('should update a plugin', async () => {
    const superadmin = await axiosAuth('test_superadmin@test.com')
    const adminOrg = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })

    const res = await superadmin.post('/api/plugins', plugin)
    expect(res.data.name).toBe(plugin.name)
    expect(res.data.id).toBe(pluginId)
    expect(res.data.version).toBe(plugin.version)

    await expect(adminOrg.post('/api/plugins')).rejects.toMatchObject({ status: 403 })
  })

  test('should list installed plugins', async () => {
    const superadmin = await axiosAuth('test_superadmin@test.com')
    const adminOrg = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
    const userOrg = await axiosAuth({ email: 'test_user1@test.com', org: 'test_org1' })

    let res = await superadmin.get('/api/plugins')
    expect(res.data.count).toBe(1)
    expect(res.data.results.length).toBe(1)
    expect(res.data.results[0].name).toBe(plugin.name)

    // admins can list installed plugins
    res = await adminOrg.get('/api/plugins')
    expect(res.data.count).toBe(1)
    expect(res.data.results.length).toBe(1)

    // regular users cannot
    await expect(userOrg.get('/api/plugins')).rejects.toMatchObject({ status: 403 })
  })

  test('should get a specific plugin', async () => {
    const superadmin = await axiosAuth('test_superadmin@test.com')
    const adminOrg = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
    const userOrg = await axiosAuth({ email: 'test_user1@test.com', org: 'test_org1' })

    await expect(superadmin.get('/api/plugins/does-not-exist')).rejects.toMatchObject({ status: 404 })

    let res = await superadmin.get('/api/plugins/' + pluginId)
    expect(res.data.name).toBe(plugin.name)
    expect(res.data.id).toBe(pluginId)
    expect(res.data.version).toBe(plugin.version)

    res = await adminOrg.get('/api/plugins/' + pluginId)
    expect(res.data.name).toBe(plugin.name)

    await expect(userOrg.get('/api/plugins/' + pluginId)).rejects.toMatchObject({ status: 403 })
  })

  test('should delete a plugin', async () => {
    const superadmin = await axiosAuth('test_superadmin@test.com')
    const adminOrg = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })

    let res = await superadmin.get('/api/plugins')
    expect(res.data.count).toBe(1)

    // only superadmin can delete plugins
    await expect(axAno.delete(`/api/plugins/${pluginId}`)).rejects.toMatchObject({ status: 401 })
    await expect(adminOrg.delete(`/api/plugins/${pluginId}`)).rejects.toMatchObject({ status: 403 })

    res = await superadmin.delete(`/api/plugins/${pluginId}`)
    expect(res.status).toBe(204)

    await expect(superadmin.get('/api/plugins/' + pluginId)).rejects.toMatchObject({ status: 404 })
    await expect(superadmin.delete(`/api/plugins/${pluginId}`)).rejects.toMatchObject({ status: 404 })
  })
})
