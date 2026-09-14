import { test, expect } from '@playwright/test'
import { axios, axiosAuth, cleanDb, cleanPlugins } from '../../support/axios.ts'
import { publishMockPlugin } from '../../support/registry.ts'

// identity webhooks are internal calls: simple-directory reaches the API directly, not through the proxy
const axIdentities = axios({ baseURL: `http://localhost:${process.env.DEV_API_PORT}`, headers: { 'x-secret-key': 'secret-identities' } })

let superadmin: any
let adminOrg: any

const createCatalog = async () => (await adminOrg.post('/api/catalogs', {
  title: 'Identities catalog',
  plugin: '@data-fair-catalog-mock-0',
  owner: { type: 'organization', id: 'test_org1', name: 'Test Org 1', department: 'dep1', departmentName: 'Department 1' },
  config: { url: 'https://data.gouv.fr', delay: 0 }
})).data

test.describe('identity webhooks', () => {
  test.beforeAll(async () => {
    await cleanPlugins()
    await publishMockPlugin()
    superadmin = await axiosAuth('test_superadmin@test.com')
    adminOrg = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
  })
  test.beforeEach(cleanDb)

  test('should follow the renames of the author, the owner and its department', async () => {
    const catalog = await createCatalog()

    await axIdentities.post('/api/identities/user/test_admin1', { name: 'Renamed Admin', organizations: [{ id: 'test_org1', role: 'admin' }] })
    let fresh = (await superadmin.get(`/api/catalogs/${catalog._id}`)).data
    expect(fresh.created.name).toBe('Renamed Admin')
    expect(fresh.updated.name).toBe('Renamed Admin')

    await axIdentities.post('/api/identities/organization/test_org1', { name: 'Renamed Org 1', departments: [{ id: 'dep1', name: 'Renamed Department' }] })
    fresh = (await superadmin.get(`/api/catalogs/${catalog._id}`)).data
    expect(fresh.owner.name).toBe('Renamed Org 1')
    expect(fresh.owner.departmentName).toBe('Renamed Department')
  })

  test('should keep only the id of a former user', async () => {
    const catalog = await createCatalog()
    await axIdentities.delete('/api/identities/user/test_admin1')
    const fresh = (await superadmin.get(`/api/catalogs/${catalog._id}`)).data
    expect(fresh.created).toEqual({ id: 'test_admin1', date: catalog.created.date })
    expect(fresh.updated.name).toBeUndefined()
  })

  test('should delete the catalogs of a deleted organization', async () => {
    const catalog = await createCatalog()
    await axIdentities.delete('/api/identities/organization/test_org1')
    await expect(superadmin.get(`/api/catalogs/${catalog._id}`)).rejects.toMatchObject({ status: 404 })
  })
})
