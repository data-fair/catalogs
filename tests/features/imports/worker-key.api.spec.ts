import { test, expect } from '../../fixtures/login.ts'
import { axiosAuth as libAxiosAuth } from '@data-fair/lib-node/axios-auth.js'
import { axiosAuth, cleanDb, directoryUrl } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'
import { dataFairSuperadmin, dataFairUrl, workerKeyTitle } from '../../support/data-fair.ts'
import { prefix } from '../../support/sd-fixtures.ts'

const owner = { type: 'organization', id: `${prefix}org1`, name: 'Test Org 1' }
const resourceId = 'category-geospatial/subcategory-transport/resource-bus-lines'

test.describe('worker key through data-fair\'s API', () => {
  test.beforeAll(publishMockPlugin)
  test.beforeEach(cleanDb)
  test.afterAll(cleanDb)

  test('the setup created the worker key through data-fair\'s API, on the settings of the sub-space', async () => {
    // tests/state-setup.ts created it (tests/support/data-fair.ts): an admin mode key acting as any account
    const settings = (await (await dataFairSuperadmin()).get(`/settings/user/${prefix}superadmin`)).data
    const keys = settings.apiKeys.filter((k: any) => k.title === workerKeyTitle)
    expect(keys).toHaveLength(1)
    expect(keys[0]).toMatchObject({ scopes: ['datasets'], adminMode: true, asAccount: true })
  })

  test('an import through the worker reaches data-fair with that key', async () => {
    test.slow()
    const admin = await axiosAuth({ email: `${prefix}org1_admin@test.com`, org: owner.id })
    const catalog = (await admin.post('/api/catalogs', { title: 'Worker key', plugin: mockPluginId, owner, config: { url: 'https://example.com', delay: 0 } })).data
    let imp = (await admin.post('/api/imports', {
      catalog: { id: catalog._id },
      config: { nbRows: 5 },
      remoteResource: { id: resourceId, title: 'Lignes de bus Paris' },
      scheduling: [],
      shouldUpdateMetadata: true,
      shouldUpdateSchema: true
    })).data

    // the worker polls every 2 s, then creates the dataset in data-fair in the name of the owner
    await expect.poll(async () => {
      imp = (await admin.get(`/api/imports/${imp._id}`)).data
      return imp.status
    }, { timeout: 60_000, intervals: [1000] }).toMatch(/^(done|error)$/)
    expect(imp.status, JSON.stringify(imp.logs, null, 1)).toBe('done')
    expect(imp.dataFairDataset?.id).toBeTruthy()

    // the dataset is in data-fair, owned by the import's owner
    const dfAdmin = await libAxiosAuth({
      email: `${prefix}org1_admin@test.com`,
      password: 'passwd',
      org: owner.id,
      directoryUrl,
      axiosOpts: { baseURL: `${dataFairUrl}/api/v1` }
    })
    const dataset = (await dfAdmin.get(`/datasets/${imp.dataFairDataset!.id}`)).data
    expect(dataset.owner).toMatchObject({ type: 'organization', id: owner.id })
    await dfAdmin.delete(`/datasets/${imp.dataFairDataset!.id}`)
  })
})
