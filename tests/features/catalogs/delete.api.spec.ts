import { test, expect } from '../../fixtures/login.ts'
import { axiosAuth, cleanDb } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

const devHost = process.env.DEV_HOST ?? 'localhost'
const nginxPort = process.env.NGINX_PORT ?? '5600'
const dataFairUrl = `http://${devHost}:${nginxPort}/data-fair`
const owner = { type: 'organization', id: 'test_org1', name: 'Test Org 1' }

test.describe('catalog deletion', () => {
  test.beforeAll(publishMockPlugin)
  test.beforeEach(cleanDb)
  test.afterAll(cleanDb)

  test('deletePublications=false keeps the remote publications, as without the parameter', async () => {
    const admin = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
    const catalog = (await admin.post('/api/catalogs', { title: 'To delete', plugin: mockPluginId, owner, config: { url: 'https://example.com', delay: 0 } })).data
    await admin.post('/api/publications', {
      catalog: { id: catalog._id },
      dataFairDataset: { id: 'kept-dataset' },
      publicationSite: { title: 'Data Fair', url: dataFairUrl, datasetUrlTemplate: `${dataFairUrl}/dataset/{id}` },
      action: 'createFolderInRoot'
    })
    expect((await admin.delete(`/api/catalogs/${catalog._id}`, { params: { deletePublications: 'false' } })).status).toBe(204)
    // deleted at once: nothing is left for the worker to delete on the remote catalog
    expect((await admin.get(`/api/catalogs/${catalog._id}`, { validateStatus: () => true })).status).toBe(404)
    expect((await admin.get('/api/publications', { params: { catalogId: catalog._id } })).data.count).toBe(0)
  })
})
