import { test, expect } from '@playwright/test'
import { axios, axiosAuth, cleanDb, cleanPlugins } from '../../support/axios.ts'
import { publishMockPlugin } from '../../support/registry.ts'

/**
 * This file is based on the permission rules described in CONTRIBUTING.md.
 */

const devHost = process.env.DEV_HOST ?? 'localhost'
const nginxPort = process.env.NGINX_PORT ?? '5600'
const dataFairUrl = `http://${devHost}:${nginxPort}/data-fair`

const axAno = axios()
let superadmin: any
let adminOtherOrg: any
let adminOrg: any
let contribOrg: any
let adminDep: any
let contribDep: any
let userOrg: any

const createCatalogPayload = (owner: any) => ({
  title: 'Test Catalog',
  plugin: '@data-fair-catalog-mock-0',
  owner,
  config: {
    url: 'https://data.gouv.fr',
    delay: 0
  }
})

test.describe('Permissions', () => {
  test.beforeAll(async () => {
    await cleanPlugins()
    await publishMockPlugin()
    superadmin = await axiosAuth('test_superadmin@test.com')
    adminOtherOrg = await axiosAuth({ email: 'test_admin2@test.com', org: 'test_org2' })
    adminOrg = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
    contribOrg = await axiosAuth({ email: 'test_contrib1@test.com', org: 'test_org1' })
    adminDep = await axiosAuth({ email: 'test_dep_admin@test.com', org: 'test_org1', dep: 'dep1' })
    contribDep = await axiosAuth({ email: 'test_dep_contrib@test.com', org: 'test_org1', dep: 'dep1' })
    userOrg = await axiosAuth({ email: 'test_user1@test.com', org: 'test_org1' })
  })
  test.beforeEach(cleanDb)
  test.afterAll(async () => {
    await cleanDb()
    await cleanPlugins()
  })

  test.describe('permissions-catalogs', () => {
    test('superadmin can create, read, update, delete catalogs at any level', async () => {
      const orgCatalog = await superadmin.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1'
      }))
      expect(orgCatalog.status).toBe(201)

      const depCatalog = await superadmin.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1', department: 'dep1'
      }))
      expect(depCatalog.status).toBe(201)

      expect((await superadmin.get(`/api/catalogs/${orgCatalog.data._id}`)).status).toBe(200)
      expect((await superadmin.get(`/api/catalogs/${depCatalog.data._id}`)).status).toBe(200)

      expect((await superadmin.patch(`/api/catalogs/${orgCatalog.data._id}`, { title: 'Updated Org Catalog' })).status).toBe(200)
      expect((await superadmin.patch(`/api/catalogs/${depCatalog.data._id}`, { title: 'Updated Dep Catalog' })).status).toBe(200)

      expect((await superadmin.delete(`/api/catalogs/${orgCatalog.data._id}`)).status).toBe(204)
      expect((await superadmin.delete(`/api/catalogs/${depCatalog.data._id}`)).status).toBe(204)
    })

    test('anonymous users cannot access catalogs (401)', async () => {
      await expect(axAno.get('/api/catalogs')).rejects.toMatchObject({ status: 401 })
      await expect(axAno.post('/api/catalogs', createCatalogPayload({ type: 'organization', id: 'test', name: 'test' })))
        .rejects.toMatchObject({ status: 401 })
    })

    test('admin from other organization cannot access catalogs from different org (403)', async () => {
      const catalog = await adminOrg.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1'
      }))

      await expect(adminOtherOrg.get(`/api/catalogs/${catalog.data._id}`)).rejects.toMatchObject({ status: 403 })
      await expect(adminOtherOrg.patch(`/api/catalogs/${catalog.data._id}`, { title: 'Hacked' })).rejects.toMatchObject({ status: 403 })
      await expect(adminOtherOrg.delete(`/api/catalogs/${catalog.data._id}`)).rejects.toMatchObject({ status: 403 })
    })

    test('organization admin can create/edit organization level catalogs', async () => {
      const catalog = await adminOrg.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1'
      }))
      expect(catalog.status).toBe(201)

      expect((await adminOrg.patch(`/api/catalogs/${catalog.data._id}`, { title: 'Updated' })).status).toBe(200)
      expect((await adminOrg.delete(`/api/catalogs/${catalog.data._id}`)).status).toBe(204)
    })

    test('organization admin can create/edit department level catalogs', async () => {
      const catalog = await adminOrg.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1', department: 'dep1'
      }))
      expect(catalog.status).toBe(201)

      expect((await adminOrg.patch(`/api/catalogs/${catalog.data._id}`, { title: 'Updated' })).status).toBe(200)
      expect((await adminOrg.delete(`/api/catalogs/${catalog.data._id}`)).status).toBe(204)
    })

    test('department admin cannot create organization level catalogs', async () => {
      await expect(adminDep.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1'
      }))).rejects.toMatchObject({ status: 403 })
    })

    test('department admin can create/edit department level catalogs', async () => {
      const catalog = await adminDep.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1', department: 'dep1'
      }))
      expect(catalog.status).toBe(201)

      expect((await adminDep.patch(`/api/catalogs/${catalog.data._id}`, { title: 'Updated' })).status).toBe(200)
      expect((await adminDep.delete(`/api/catalogs/${catalog.data._id}`)).status).toBe(204)
    })

    test('contributors cannot create/edit/delete catalogs', async () => {
      await expect(contribOrg.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1'
      }))).rejects.toMatchObject({ status: 403 })

      await expect(contribDep.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1', department: 'dep1'
      }))).rejects.toMatchObject({ status: 403 })

      await expect(userOrg.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1'
      }))).rejects.toMatchObject({ status: 403 })
    })
  })

  test.describe('permissions-import', () => {
    let orgCatalog: any
    let depCatalog: any

    test.beforeEach(async () => {
      orgCatalog = await superadmin.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1'
      }))
      depCatalog = await superadmin.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1', department: 'dep1'
      }))
    })

    const createImportPayload = (catalogId: string) => ({
      catalog: { id: catalogId },
      config: {},
      remoteResource: { id: 'test-resource' },
      scheduling: [],
      shouldUpdateMetadata: true,
      shouldUpdateSchema: true
    })

    test('superadmin can import from any catalog', async () => {
      expect((await superadmin.post('/api/imports', createImportPayload(orgCatalog.data._id))).status).toBe(201)
      expect((await superadmin.post('/api/imports', createImportPayload(depCatalog.data._id))).status).toBe(201)
    })

    test('anonymous users cannot import (401)', async () => {
      await expect(axAno.post('/api/imports', createImportPayload(orgCatalog.data._id)))
        .rejects.toMatchObject({ status: 401 })
    })

    test('admin from other organization cannot import (403)', async () => {
      await expect(adminOtherOrg.post('/api/imports', createImportPayload(orgCatalog.data._id)))
        .rejects.toMatchObject({ status: 403 })
    })

    test('organization admin can import from any catalog (org and department)', async () => {
      expect((await adminOrg.post('/api/imports', createImportPayload(orgCatalog.data._id))).status).toBe(201)
      expect((await adminOrg.post('/api/imports', createImportPayload(depCatalog.data._id))).status).toBe(201)
    })

    test('department admin can only import from same department catalogs', async () => {
      expect((await adminDep.post('/api/imports', createImportPayload(depCatalog.data._id))).status).toBe(201)
      await expect(adminDep.post('/api/imports', createImportPayload(orgCatalog.data._id)))
        .rejects.toMatchObject({ status: 403 })
    })

    test('contributors cannot import', async () => {
      await expect(contribOrg.post('/api/imports', createImportPayload(orgCatalog.data._id)))
        .rejects.toMatchObject({ status: 403 })
      await expect(contribDep.post('/api/imports', createImportPayload(depCatalog.data._id)))
        .rejects.toMatchObject({ status: 403 })
      await expect(userOrg.post('/api/imports', createImportPayload(orgCatalog.data._id)))
        .rejects.toMatchObject({ status: 403 })
    })
  })

  test.describe('permissions-publish', () => {
    let orgCatalog: any
    let depCatalog: any

    test.beforeEach(async () => {
      orgCatalog = await superadmin.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1'
      }))
      depCatalog = await superadmin.post('/api/catalogs', createCatalogPayload({
        type: 'organization', id: 'test_org1', name: 'Test Org 1', department: 'dep1'
      }))
    })

    const createPublicationPayload = (catalogId: string, dataFairDatasetId: string) => ({
      catalog: { id: catalogId },
      dataFairDataset: { id: dataFairDatasetId },
      publicationSite: {
        title: 'Data Fair',
        url: dataFairUrl,
        datasetUrlTemplate: `${dataFairUrl}/dataset/{id}`
      },
      action: 'createFolderInRoot'
    })

    test('superadmin can publish any dataset to any catalog', async () => {
      expect((await superadmin.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'org-dataset'))).status).toBe(201)
      expect((await superadmin.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'dep-dataset'))).status).toBe(201)
      expect((await superadmin.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'dep-dataset'))).status).toBe(201)
      expect((await superadmin.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'org-dataset'))).status).toBe(201)
    })

    test('anonymous users cannot publish (401)', async () => {
      await expect(axAno.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'test-dataset')))
        .rejects.toMatchObject({ status: 401 })
    })

    test('admin from other organization cannot publish (403)', async () => {
      await expect(adminOtherOrg.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'test-dataset')))
        .rejects.toMatchObject({ status: 403 })
    })

    test('organization admin can publish organization dataset to organization catalog', async () => {
      expect((await adminOrg.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'org-dataset'))).status).toBe(201)
    })

    test('department admin cannot publish organization dataset to organization catalog', async () => {
      await expect(adminDep.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'org-dataset')))
        .rejects.toMatchObject({ status: 403 })
    })

    test.skip('organization admin cannot publish organization dataset to department catalog', async () => {
      // This check is done by the worker.
      await expect(adminOrg.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'org-dataset')))
        .rejects.toMatchObject({ status: 403 })
    })

    test.skip('department admin cannot publish organization dataset to department catalog', async () => {
      // For now, we just check (by the worker) that the user has the right to read the dataset to publish it.
      await expect(adminDep.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'org-dataset')))
        .rejects.toMatchObject({ status: 403 })
    })

    test('organization admin can publish department dataset to organization catalog', async () => {
      expect((await adminOrg.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'dep-dataset'))).status).toBe(201)
    })

    test('department admin cannot publish department dataset to organization catalog (should ask admin)', async () => {
      // TODO: for the moment this is just forbidden - should be changed to ask admin
      await expect(adminDep.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'dep-dataset')))
        .rejects.toMatchObject({ status: 403 })
    })

    test('organization admin can publish department dataset to department catalog', async () => {
      expect((await adminOrg.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'dep-dataset'))).status).toBe(201)
    })

    test('department admin can publish department dataset to department catalog', async () => {
      expect((await adminDep.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'dep-dataset'))).status).toBe(201)
    })

    test('contributors cannot publish', async () => {
      await expect(contribOrg.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'test-dataset')))
        .rejects.toMatchObject({ status: 403 })
      await expect(contribDep.post('/api/publications', createPublicationPayload(depCatalog.data._id, 'test-dataset')))
        .rejects.toMatchObject({ status: 403 })
      await expect(userOrg.post('/api/publications', createPublicationPayload(orgCatalog.data._id, 'test-dataset')))
        .rejects.toMatchObject({ status: 403 })
    })
  })
})
