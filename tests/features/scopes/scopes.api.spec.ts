import { test, expect } from '../../fixtures/login.ts'
import { axiosAuth, cleanDb } from '../../support/axios.ts'
import { nhiSession } from '../../support/nhi.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

const devHost = process.env.DEV_HOST ?? 'localhost'
const nginxPort = process.env.NGINX_PORT ?? '5600'
const dataFairUrl = `http://${devHost}:${nginxPort}/data-fair`

const owner = { type: 'organization', id: 'test_org1', name: 'Test Org 1' }
const status = { validateStatus: () => true }

const catalogPayload = (o = owner) => ({ title: 'Scoped catalog', plugin: mockPluginId, owner: o, config: { url: 'https://example.com', delay: 0 } })
const importPayload = (catalogId: string) => ({ catalog: { id: catalogId }, config: {}, remoteResource: { id: 'r1', title: 'Resource 1' }, scheduling: [], shouldUpdateMetadata: true, shouldUpdateSchema: true })
const publicationPayload = (catalogId: string) => ({
  catalog: { id: catalogId },
  dataFairDataset: { id: 'scoped-dataset' },
  publicationSite: { title: 'Data Fair', url: dataFairUrl, datasetUrlTemplate: `${dataFairUrl}/dataset/{id}` },
  action: 'createFolderInRoot'
})

const seed = async () => {
  const admin = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
  const catalog = (await admin.post('/api/catalogs', catalogPayload())).data
  const imp = (await admin.post('/api/imports', importPayload(catalog._id))).data
  return { admin, catalog, imp }
}

test.describe('scopes', () => {
  test.beforeAll(publishMockPlugin)
  test.beforeEach(cleanDb)
  test.afterAll(cleanDb)

  test('catalogs:read reads but does not import nor configure', async () => {
    const { catalog } = await seed()
    const { bearerAx } = await nhiSession('catalogs:read')
    expect((await bearerAx.get('/api/catalogs', status)).status).toBe(200)
    expect((await bearerAx.get(`/api/catalogs/${catalog._id}`, status)).status).toBe(200)
    expect((await bearerAx.get('/api/imports', status)).status).toBe(200)
    expect((await bearerAx.post('/api/imports', importPayload(catalog._id), status)).status).toBe(403)
    expect((await bearerAx.patch(`/api/catalogs/${catalog._id}`, { title: 'renamed' }, status)).status).toBe(403)
  })

  test('catalogs:write imports and publishes but does not connect, delete nor configure catalogs', async () => {
    const { catalog, imp } = await seed()
    const { bearerAx } = await nhiSession('catalogs:write')
    expect((await bearerAx.post('/api/imports', { ...importPayload(catalog._id), remoteResource: { id: 'r2', title: 'Resource 2' } }, status)).status).toBe(201)
    expect((await bearerAx.post('/api/publications', publicationPayload(catalog._id), status)).status).toBe(201)
    expect((await bearerAx.patch(`/api/imports/${imp._id}`, { isSchedulingActive: false }, status)).status).toBe(200)
    expect((await bearerAx.post('/api/catalogs', catalogPayload(), status)).status).toBe(403)
    expect((await bearerAx.delete(`/api/imports/${imp._id}`, status)).status).toBe(403)
    expect((await bearerAx.patch(`/api/catalogs/${catalog._id}`, { title: 'renamed' }, status)).status).toBe(403)
  })

  test('patching the admin parts of an import needs the admin tier, and nothing is saved without it', async () => {
    const { admin, imp } = await seed()
    const { bearerAx } = await nhiSession('catalogs:write')
    expect((await bearerAx.patch(`/api/imports/${imp._id}`, { dataFairDataset: { id: 'x' } }, status)).status).toBe(403)
    expect((await bearerAx.patch(`/api/imports/${imp._id}`, { isSchedulingActive: false, owner }, status)).status).toBe(403)
    const saved = (await admin.get(`/api/imports/${imp._id}`)).data
    expect(saved.dataFairDataset?.id).not.toBe('x')
    expect(saved.isSchedulingActive).not.toBe(false)
  })

  test('importing into an existing dataset needs the admin tier', async () => {
    const { catalog } = await seed()
    const write = (await nhiSession('catalogs:write')).bearerAx
    const payload = { ...importPayload(catalog._id), remoteResource: { id: 'r3', title: 'Resource 3' } }
    expect((await write.post('/api/imports', { ...payload, dataFairDataset: { id: 'x' } }, status)).status).toBe(403)
    expect((await write.post('/api/imports', { ...payload, separator: ';' }, status)).status).toBe(403)
    const admin = (await nhiSession('catalogs:admin')).bearerAx
    expect((await admin.post('/api/imports', { ...payload, dataFairDataset: { id: 'x' } }, status)).status).toBe(201)
  })

  for (const scope of ['catalogs:admin', 'all:admin']) {
    test(`${scope} connects and deletes catalogs`, async () => {
      const { bearerAx } = await nhiSession(scope)
      const created = await bearerAx.post('/api/catalogs', catalogPayload(), status)
      expect(created.status).toBe(201)
      expect((await bearerAx.delete(`/api/catalogs/${created.data._id}`, status)).status).toBe(204)
    })
  }

  test('a scope of another family is refused', async () => {
    const { bearerAx } = await nhiSession('datasets:read')
    expect((await bearerAx.get('/api/catalogs', status)).status).toBe(403)
  })

  test('the umbrella scope does not open unlisted routes', async () => {
    const { bearerAx } = await nhiSession('catalogs')
    expect((await bearerAx.get('/api/catalogs', status)).status).toBe(200)
    expect((await bearerAx.get('/api/admin/status', status)).status).toBe(403)
  })

  test('an unrestricted NHI session is unchanged', async () => {
    const { bearerAx } = await nhiSession()
    expect((await bearerAx.get('/api/catalogs', status)).status).toBe(200)
  })

  test('the account role still applies to a scoped session', async () => {
    const admin2 = await axiosAuth({ email: 'test_admin2@test.com', org: 'test_org2' })
    const other = (await admin2.post('/api/catalogs', catalogPayload({ type: 'organization', id: 'test_org2', name: 'Test Org 2' }))).data
    const scoped = (await (await nhiSession('catalogs:admin')).bearerAx.get(`/api/catalogs/${other._id}`, status)).status
    const unscoped = (await (await nhiSession()).bearerAx.get(`/api/catalogs/${other._id}`, status)).status
    expect(scoped).not.toBe(200)
    expect(scoped).toBe(unscoped)
  })
})
