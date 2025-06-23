import { strict as assert } from 'node:assert'
import { it, describe, before, after } from 'node:test'
import { axios, axiosAuth, cleanAll, startApiServer, stopApiServer } from './utils/index.ts'

const axAno = axios()
const superadmin = await axiosAuth('superadmin@test.com')
const adminOrga = await axiosAuth({ email: 'admin@test.com', org: 'KWqAGZ4mG' })
const userOrga = await axiosAuth({ email: 'user@test.com', org: 'KWqAGZ4mG' })

// Mock project : https://github.com/data-fair/catalog-mock
const plugin = {
  name: '@data-fair/catalog-mock',
  version: '0.2.0'
}
const pluginId = '@data-fair-catalog-mock'

describe('plugin', () => {
  before(startApiServer)
  after(cleanAll)
  after(stopApiServer)

  it('should install a plugin from npm', async () => {
    const res = await superadmin.post('/api/plugins', {
      name: plugin.name,
      version: '0.1.1' // Previous version to test update
    })
    assert.equal(res.data.name, '@data-fair/catalog-mock', 'Plugin name should match')
    assert.equal(res.data.id, pluginId, 'Plugin ID should match')
    assert.equal(res.data.version, '0.1.1', 'Plugin version should match')

    // Only superadmin can install plugins
    await assert.rejects(
      adminOrga.post('/api/plugins'),
      (err: { status: number }) => err.status === 403,
      'Only superadmin can install plugins'
    )
  })

  it('should install a plugin from tarball', async () => {
    const FormData = (await import('form-data')).default
    const fs = await import('fs')
    const path = await import('path')

    const tarballPath = path.join(import.meta.dirname, 'utils', 'catalog-mock.tgz')
    const formData = new FormData()
    formData.append('file', fs.createReadStream(tarballPath))

    const res = await superadmin.post('/api/plugins', formData, {
      headers: formData.getHeaders()
    })

    assert.equal(res.data.name, '@data-fair/catalog-mock', 'Plugin name should match')
    assert.equal(pluginId, res.data.id, 'Plugin ID should match')
    assert.equal(res.data.version, '0.2.0', 'Plugin version should match tarball version')

    // Only superadmin can install plugins
    await assert.rejects(
      adminOrga.post('/api/plugins'),
      (err: { status: number }) => err.status === 403,
      'Only superadmin can install plugins'
    )
  })

  it('should update a plugin', async () => {
    const res = await superadmin.post('/api/plugins', plugin)
    assert.equal(res.data.name, '@data-fair/catalog-mock', 'Plugin name should match')
    assert.equal(pluginId, res.data.id, 'Plugin ID should match')
    assert.equal(res.data.version, plugin.version, 'Plugin version should match')

    // Only superadmin can install plugins
    await assert.rejects(
      adminOrga.post('/api/plugins'),
      (err: { status: number }) => err.status === 403,
      'Only superadmin can install plugins'
    )
  })

  it('should list installed plugins', async () => {
    // List plugins as superadmin
    let res = await superadmin.get('/api/plugins')
    assert.equal(res.data.count, 1, 'Superadmin should see the installed plugin')
    assert.equal(res.data.results.length, 1)
    assert.equal(res.data.results[0].name, plugin.name)

    // List plugins as admin
    res = await adminOrga.get('/api/plugins')
    assert.equal(res.data.count, 1, 'Admin should see the installed plugin')
    assert.equal(res.data.results.length, 1)

    // List plugins as user (not allowed)
    await assert.rejects(
      userOrga.get('/api/plugins'),
      (err: { status: number }) => err.status === 403,
      'User should not see the installed plugins'
    )
  })

  it('should get specific plugin', async () => {
    // Get a plugin that not exists (should fail)
    await assert.rejects(
      superadmin.get('/api/plugins/does-not-exist'),
      (err: { status: number }) => err.status === 404,
      'Should not find a plugin that does not exist'
    )

    // Get plugin as superadmin
    let res = await superadmin.get('/api/plugins/' + pluginId)
    assert.equal(res.data.name, plugin.name, 'Superadmin should get the plugin details')
    assert.equal(res.data.id, pluginId)
    assert.equal(res.data.version, plugin.version)

    // Get plugin as admin
    res = await adminOrga.get('/api/plugins/' + pluginId)
    assert.equal(res.data.name, plugin.name, 'Admin should get the plugin details')

    // Get plugin as user (not allowed)
    await assert.rejects(
      userOrga.get('/api/plugins/' + pluginId),
      (err: { status: number }) => err.status === 403,
      'User should not get the plugin details'
    )
  })

  it('should delete a plugin', async () => {
    // Check that the plugin is installed before deletion
    let res = await superadmin.get('/api/plugins')
    assert.equal(res.data.count, 1, 'There should be one plugin installed before deletion')

    // Only superadmin can delete plugins
    await assert.rejects(
      axAno.delete(`/api/plugins/${pluginId}`),
      (err: { status: number }) => err.status === 401,
      'Only superadmin can delete plugins, not anonymous user'
    )
    await assert.rejects(
      adminOrga.delete(`/api/plugins/${pluginId}`),
      (err: { status: number }) => err.status === 403,
      'Only superadmin can delete plugins, not admin'
    )

    // Delete the plugin
    res = await superadmin.delete(`/api/plugins/${pluginId}`)
    assert.equal(res.status, 204, 'Plugin should be deleted successfully when called by superadmin')

    // Check that the plugin is deleted
    await assert.rejects(
      superadmin.get('/api/plugins/' + pluginId),
      (err: { status: number }) => err.status === 404,
      'Plugin is found after deletion, should not be found'
    )

    // Try to delete again (should fail)
    await assert.rejects(
      superadmin.delete(`/api/plugins/${pluginId}`),
      (err: { status: number }) => err.status === 404,
      'Should not be able to delete a plugin that does not exist anymore'
    )
  })
})
