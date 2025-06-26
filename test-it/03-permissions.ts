import { strict as assert } from 'node:assert'
import { it, describe, before, after, beforeEach } from 'node:test'
import { axios, axiosAuth, clean, cleanAll, installMockPlugin, startApiServer, stopApiServer } from './utils/index.ts'

/**
 * This file is based on the permissions rules presents in the
 * CONTRIBUTING.md file.
 */

const axAno = axios()
const superadmin = await axiosAuth('superadmin@test.com')
const adminOtherOrga = await axiosAuth({ email: 'dmeadus@answers.com', org: 'EnTgB2UbH' })
const adminOrga = await axiosAuth({ email: 'admin@test.com', org: 'KWqAGZ4mG' })
const contribOrga = await axiosAuth({ email: 'contrib@test.com', org: 'KWqAGZ4mG' })
const adminDep = await axiosAuth({ email: 'admin.dep@test.com', org: 'KWqAGZ4mG', dep: 'dep1' })
const contribDep = await axiosAuth({ email: 'contrib.dep@test.com', org: 'KWqAGZ4mG', dep: 'dep1' })
const userOrga = await axiosAuth({ email: 'user@test.com', org: 'KWqAGZ4mG' })

describe('Permissions', () => {
  before(startApiServer)
  before(installMockPlugin)
  beforeEach(clean)
  after(cleanAll)
  after(stopApiServer)

  const createCatalogPayload = (owner: any) => ({
    title: 'Test Catalog',
    plugin: '@data-fair-catalog-mock-0',
    owner,
    config: {
      url: 'https://data.gouv.fr'
    }
  })

  describe('permissions-catalogs', () => {
    // Test superadmin can do everything
    it('superadmin can create, read, update, delete catalogs at any level', async () => {
      // Organization level catalog
      const orgCatalog = await superadmin.post('/api/catalogs', createCatalogPayload({
        type: 'organization',
        id: 'KWqAGZ4mG',
        name: 'Fivechat'
      }))
      assert.equal(orgCatalog.status, 200, 'Superadmin should be able to create a catalog in an organization')

      // Department level catalog
      const depCatalog = await superadmin.post('/api/catalogs', createCatalogPayload({
        type: 'organization',
        id: 'KWqAGZ4mG',
        name: 'Fivechat',
        department: 'dep1'
      }))
      assert.equal(depCatalog.status, 200, 'Superadmin should be able to create a catalog in a department')

      // Get catalogs
      const getOrg = await superadmin.get(`/api/catalogs/${orgCatalog.data._id}`)
      assert.equal(getOrg.status, 200, 'Superadmin should be able to read an organization catalog')

      const getDep = await superadmin.get(`/api/catalogs/${depCatalog.data._id}`)
      assert.equal(getDep.status, 200, 'Superadmin should be able to read a department catalog')

      // Update catalogs
      const updateOrg = await superadmin.patch(`/api/catalogs/${orgCatalog.data._id}`, { title: 'Updated Org Catalog' })
      assert.equal(updateOrg.status, 200, 'Superadmin should be able to update an organization catalog')

      const updateDep = await superadmin.patch(`/api/catalogs/${depCatalog.data._id}`, { title: 'Updated Dep Catalog' })
      assert.equal(updateDep.status, 200, 'Superadmin should be able to update a department catalog')

      // Delete catalogs
      const deleteOrg = await superadmin.delete(`/api/catalogs/${orgCatalog.data._id}`)
      assert.equal(deleteOrg.status, 204, 'Superadmin should be able to delete an organization catalog')

      const deleteDep = await superadmin.delete(`/api/catalogs/${depCatalog.data._id}`)
      assert.equal(deleteDep.status, 204, 'Superadmin should be able to delete a department catalog')
    })

    // Test anonymous users get 401
    it('anonymous users cannot access catalogs (401)', async () => {
      await assert.rejects(
        axAno.get('/api/catalogs'),
        (err: { status: number }) => err.status === 401,
        'Anonymous users should get 401 when trying to list catalogs'
      )

      await assert.rejects(
        axAno.post('/api/catalogs', createCatalogPayload({ type: 'organization', id: 'test', name: 'test' })),
        (err: { status: number }) => err.status === 401,
        'Anonymous users should get 401 when trying to create a catalog'
      )
    })

    // Test admin from other organization gets 403
    it('admin from other organization cannot access catalogs from different org (403)', async () => {
      // Create catalog as adminOrga
      const catalog = await adminOrga.post('/api/catalogs', createCatalogPayload({
        type: 'organization',
        id: 'KWqAGZ4mG',
        name: 'Fivechat'
      }))

      // adminOtherOrga should not be able to access it
      await assert.rejects(
        adminOtherOrga.get(`/api/catalogs/${catalog.data._id}`),
        (err: { status: number }) => err.status === 403,
        'Admin from different organization should get 403 when trying to read a catalog'
      )

      await assert.rejects(
        adminOtherOrga.patch(`/api/catalogs/${catalog.data._id}`, { title: 'Hacked' }),
        (err: { status: number }) => err.status === 403,
        'Admin from different organization should get 403 when trying to update a catalog'
      )

      await assert.rejects(
        adminOtherOrga.delete(`/api/catalogs/${catalog.data._id}`),
        (err: { status: number }) => err.status === 403,
        'Admin from different organization should get 403 when trying to delete a catalog'
      )
    })

    // Organization admin permissions
    it('organization admin can create/edit organization level catalogs', async () => {
      const catalog = await adminOrga.post('/api/catalogs', createCatalogPayload({
        type: 'organization',
        id: 'KWqAGZ4mG',
        name: 'Fivechat'
      }))
      assert.equal(catalog.status, 200, 'Organization admin should be able to create organization level catalog')

      const updated = await adminOrga.patch(`/api/catalogs/${catalog.data._id}`, { title: 'Updated' })
      assert.equal(updated.status, 200, 'Organization admin should be able to update organization level catalog')

      const deleted = await adminOrga.delete(`/api/catalogs/${catalog.data._id}`)
      assert.equal(deleted.status, 204, 'Organization admin should be able to delete organization level catalog')
    })

    it('organization admin can create/edit department level catalogs', async () => {
      const catalog = await adminOrga.post('/api/catalogs', createCatalogPayload({
        type: 'organization',
        id: 'KWqAGZ4mG',
        name: 'Fivechat',
        department: 'dep1'
      }))
      assert.equal(catalog.status, 200, 'Organization admin should be able to create department level catalog')

      const updated = await adminOrga.patch(`/api/catalogs/${catalog.data._id}`, { title: 'Updated' })
      assert.equal(updated.status, 200, 'Organization admin should be able to update department level catalog')

      const deleted = await adminOrga.delete(`/api/catalogs/${catalog.data._id}`)
      assert.equal(deleted.status, 204, 'Organization admin should be able to delete department level catalog')
    })

    // Department admin permissions
    it('department admin cannot create organization level catalogs', async () => {
      await assert.rejects(
        adminDep.post('/api/catalogs', createCatalogPayload({
          type: 'organization',
          id: 'KWqAGZ4mG',
          name: 'Fivechat'
        })),
        (err: { status: number }) => err.status === 403,
        'Department admin should not be able to create organization level catalog'
      )
    })

    it('department admin can create/edit department level catalogs', async () => {
      const catalog = await adminDep.post('/api/catalogs', createCatalogPayload({
        type: 'organization',
        id: 'KWqAGZ4mG',
        name: 'Fivechat',
        department: 'dep1'
      }))
      assert.equal(catalog.status, 200, 'Department admin should be able to create department level catalog')

      const updated = await adminDep.patch(`/api/catalogs/${catalog.data._id}`, { title: 'Updated' })
      assert.equal(updated.status, 200, 'Department admin should be able to update department level catalog')

      const deleted = await adminDep.delete(`/api/catalogs/${catalog.data._id}`)
      assert.equal(deleted.status, 204, 'Department admin should be able to delete department level catalog')
    })

    // Non-admin users cannot create/edit/delete catalogs
    it('contributors cannot create/edit/delete catalogs', async () => {
      await assert.rejects(
        contribOrga.post('/api/catalogs', createCatalogPayload({
          type: 'organization',
          id: 'KWqAGZ4mG',
          name: 'Fivechat'
        })),
        (err: { status: number }) => err.status === 403,
        'Organization contributor should not be able to create catalogs'
      )

      await assert.rejects(
        contribDep.post('/api/catalogs', createCatalogPayload({
          type: 'organization',
          id: 'KWqAGZ4mG',
          name: 'Fivechat',
          department: 'dep1'
        })),
        (err: { status: number }) => err.status === 403,
        'Department contributor should not be able to create catalogs'
      )

      await assert.rejects(
        userOrga.post('/api/catalogs', createCatalogPayload({
          type: 'organization',
          id: 'KWqAGZ4mG',
          name: 'Fivechat'
        })),
        (err: { status: number }) => err.status === 403,
        'Regular user should not be able to create catalogs'
      )
    })
  })

  describe('permissions-import', () => {
    let orgCatalog: any
    let depCatalog: any

    beforeEach(async () => {
      // Create test catalogs
      orgCatalog = await superadmin.post('/api/catalogs', createCatalogPayload({
        type: 'organization',
        id: 'KWqAGZ4mG',
        name: 'Fivechat'
      }))

      depCatalog = await superadmin.post('/api/catalogs', createCatalogPayload({
        type: 'organization',
        id: 'KWqAGZ4mG',
        name: 'Fivechat',
        department: 'dep1'
      }))
    })

    const createImportPayload = (catalogId: string) => ({
      catalog: { id: catalogId },
      remoteResource: { id: 'test-resource' },
      scheduling: []
    })

    it('superadmin can import from any catalog', async () => {
      const orgImport = await superadmin.post('/api/imports', createImportPayload(orgCatalog.data._id))
      assert.equal(orgImport.status, 201, 'Superadmin should be able to import from organization catalog')

      const depImport = await superadmin.post('/api/imports', createImportPayload(depCatalog.data._id))
      assert.equal(depImport.status, 201, 'Superadmin should be able to import from department catalog')
    })

    it('anonymous users cannot import (401)', async () => {
      await assert.rejects(
        axAno.post('/api/imports', createImportPayload(orgCatalog.data._id)),
        (err: { status: number }) => err.status === 401,
        'Anonymous users should get 401 when trying to import'
      )
    })

    it('admin from other organization cannot import (403)', async () => {
      await assert.rejects(
        adminOtherOrga.post('/api/imports', createImportPayload(orgCatalog.data._id)),
        (err: { status: number }) => err.status === 403,
        'Admin from different organization should get 403 when trying to import'
      )
    })

    it('organization admin can import from any catalog (org and department)', async () => {
      const orgImport = await adminOrga.post('/api/imports', createImportPayload(orgCatalog.data._id))
      assert.equal(orgImport.status, 201, 'Organization admin should be able to import from organization catalog')

      const depImport = await adminOrga.post('/api/imports', createImportPayload(depCatalog.data._id))
      assert.equal(depImport.status, 201, 'Organization admin should be able to import from department catalog')
    })

    it('department admin can only import from same department catalogs', async () => {
      // Can import from department catalog
      const depImport = await adminDep.post('/api/imports', createImportPayload(depCatalog.data._id))
      assert.equal(depImport.status, 201, 'Department admin should be able to import from same department catalog')

      // Cannot import from organization catalog (different owner)
      await assert.rejects(
        adminDep.post('/api/imports', createImportPayload(orgCatalog.data._id)),
        (err: { status: number }) => err.status === 403,
        'Department admin should not be able to import from organization catalog'
      )
    })

    it('contributors cannot import', async () => {
      await assert.rejects(
        contribOrga.post('/api/imports', createImportPayload(orgCatalog.data._id)),
        (err: { status: number }) => err.status === 403,
        'Organization contributor should not be able to import'
      )

      await assert.rejects(
        contribDep.post('/api/imports', createImportPayload(depCatalog.data._id)),
        (err: { status: number }) => err.status === 403,
        'Department contributor should not be able to import'
      )

      await assert.rejects(
        userOrga.post('/api/imports', createImportPayload(orgCatalog.data._id)),
        (err: { status: number }) => err.status === 403,
        'Regular user should not be able to import'
      )
    })
  })

  describe('permissions-publish', () => {
    let orgCatalog: any
    let depCatalog: any

    beforeEach(async () => {
      // Create test catalogs
      orgCatalog = await superadmin.post('/api/catalogs', createCatalogPayload({
        type: 'organization',
        id: 'KWqAGZ4mG',
        name: 'Fivechat'
      }))

      depCatalog = await superadmin.post('/api/catalogs', createCatalogPayload({
        type: 'organization',
        id: 'KWqAGZ4mG',
        name: 'Fivechat',
        department: 'dep1'
      }))
    })

    const createPublicationPayload = (catalogId: string, dataFairDatasetId: string) => ({
      catalog: { id: catalogId },
      dataFairDataset: { id: dataFairDatasetId },
      publicationSite: {
        title: 'Data Fair',
        url: 'http://localhost:5600/data-fair',
        datasetUrlTemplate: 'http://localhost:5600/data-fair/dataset/{id}'
      },
      action: 'create'
    })

    it('superadmin can publish any dataset to any catalog', async () => {
      // Organization dataset to organization catalog - Allowed
      const pub1 = await superadmin.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'org-dataset'))
      assert.equal(pub1.status, 201, 'Superadmin should be able to publish organization dataset to organization catalog')

      // Department dataset to organization catalog - Allowed
      const pub2 = await superadmin.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'dep-dataset'))
      assert.equal(pub2.status, 201, 'Superadmin should be able to publish department dataset to organization catalog')

      // Department dataset to department catalog - Allowed
      const pub3 = await superadmin.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'dep-dataset'))
      assert.equal(pub3.status, 201, 'Superadmin should be able to publish department dataset to department catalog')

      // Organization dataset to department catalog - Forbidden in practice but superadmin can override
      const pub4 = await superadmin.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'org-dataset'))
      assert.equal(pub4.status, 201, 'Superadmin should be able to publish organization dataset to department catalog')
    })

    it('anonymous users cannot publish (401)', async () => {
      await assert.rejects(
        axAno.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'test-dataset')),
        (err: { status: number }) => err.status === 401,
        'Anonymous users should get 401 when trying to publish'
      )
    })

    it('admin from other organization cannot publish (403)', async () => {
      await assert.rejects(
        adminOtherOrga.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'test-dataset')),
        (err: { status: number }) => err.status === 403,
        'Admin from different organization should get 403 when trying to publish'
      )
    })

    // Organization Level Dataset permissions
    it('organization admin can publish organization dataset to organization catalog', async () => {
      const pub = await adminOrga.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'org-dataset'))
      assert.equal(pub.status, 201, 'Organization admin should be able to publish organization dataset to organization catalog')
    })

    it('department admin cannot publish organization dataset to organization catalog', async () => {
      await assert.rejects(
        adminDep.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'org-dataset')),
        (err: { status: number }) => err.status === 403,
        'Department admin should not be able to publish organization dataset to organization catalog'
      )
    })

    it('organization admin cannot publish organization dataset to department catalog', { skip: 'This check is done by the worker' }, async () => {
      await assert.rejects(
        adminOrga.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'org-dataset')),
        (err: { status: number }) => err.status === 403,
        'Organization admin should not be able to publish organization dataset to department catalog'
      )
    })

    it('department admin cannot publish organization dataset to department catalog', { skip: 'For now, we just check (by the worker) that the user has the right to read the dataset to publish it' }, async () => {
      await assert.rejects(
        adminDep.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'org-dataset')),
        (err: { status: number }) => err.status === 403,
        'Department admin should not be able to publish organization dataset to department catalog'
      )
    })

    // Department Level Dataset permissions
    it('organization admin can publish department dataset to organization catalog', async () => {
      const pub = await adminOrga.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'dep-dataset'))
      assert.equal(pub.status, 201, 'Organization admin should be able to publish department dataset to organization catalog')
    })

    it('department admin cannot publish department dataset to organization catalog (should ask admin)', async () => {
      // TODO: For the moment, this is just forbidden - should be changed to ask admin
      await assert.rejects(
        adminDep.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'dep-dataset')),
        (err: { status: number }) => err.status === 403,
        'Department admin should not be able to publish department dataset to organization catalog (should ask admin in future)'
      )
    })

    it('organization admin can publish department dataset to department catalog', async () => {
      const pub = await adminOrga.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'dep-dataset'))
      assert.equal(pub.status, 201, 'Organization admin should be able to publish department dataset to department catalog')
    })

    it('department admin can publish department dataset to department catalog', async () => {
      const pub = await adminDep.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'dep-dataset'))
      assert.equal(pub.status, 201, 'Department admin should be able to publish department dataset to same department catalog')
    })

    it('contributors cannot publish', async () => {
      await assert.rejects(
        contribOrga.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'test-dataset')),
        (err: { status: number }) => err.status === 403,
        'Organization contributor should not be able to publish'
      )

      await assert.rejects(
        contribDep.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'test-dataset')),
        (err: { status: number }) => err.status === 403,
        'Department contributor should not be able to publish'
      )

      await assert.rejects(
        userOrga.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'test-dataset')),
        (err: { status: number }) => err.status === 403,
        'Regular user should not be able to publish'
      )
    })
  })
})
