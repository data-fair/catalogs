import { test, expect } from '../../fixtures/login.ts'
import { axiosAuth, cleanDb } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

const owner = { type: 'organization', id: 'test_org1', name: 'Test Org 1' }
const status = { validateStatus: () => true }

test.describe('import configuration', () => {
  test.beforeAll(publishMockPlugin)
  test.beforeEach(cleanDb)
  test.afterAll(cleanDb)

  const create = async () => {
    const admin = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
    const catalog = (await admin.post('/api/catalogs', { title: 'Source', plugin: mockPluginId, owner, config: { url: 'https://example.com', delay: 0 } })).data
    const imp = (await admin.post('/api/imports', { catalog: { id: catalog._id }, config: {}, remoteResource: { id: 'r1', title: 'Resource 1' }, scheduling: [], isSchedulingActive: true, shouldUpdateMetadata: true, shouldUpdateSchema: true })).data
    return { admin, catalog, imp }
  }

  test('a whole-document save round trips', async () => {
    const { admin, imp } = await create()
    const conf = (await admin.get(`/api/imports/${imp._id}/configuration`)).data
    expect(Object.keys(conf).sort()).toEqual(['config', 'isSchedulingActive', 'scheduling', 'shouldUpdateMetadata', 'shouldUpdateSchema'])
    const saved = await admin.put(`/api/imports/${imp._id}/configuration`, { ...conf, config: { nbRows: 20 }, isSchedulingActive: false })
    expect(saved.status).toBe(200)
    expect(saved.data).toEqual({ ...conf, config: { nbRows: 20 }, isSchedulingActive: false })
    expect((await admin.get(`/api/imports/${imp._id}/configuration`)).data).toEqual(saved.data)
  })

  test('a key outside the configuration is refused', async () => {
    const { admin, imp } = await create()
    expect((await admin.put(`/api/imports/${imp._id}/configuration`, { config: {}, owner }, status)).status).toBe(400)
  })

  test('the schema has the import config of the plugin and static time zones', async () => {
    const { admin, imp } = await create()
    const schema = (await admin.get(`/api/imports/${imp._id}/configuration-schema`)).data
    expect(schema.properties.config.properties.nbRows).toBeTruthy()
    expect(JSON.stringify(schema)).not.toContain('context.utcs')
  })

  test('without the importConfig capability there is no config', async () => {
    const { admin, catalog, imp } = await create()
    const superadmin = await axiosAuth('test_superadmin@test.com')
    await superadmin.patch(`/api/catalogs/${catalog._id}`, { capabilities: catalog.capabilities.filter((c: string) => c !== 'importConfig') })
    const schema = (await admin.get(`/api/imports/${imp._id}/configuration-schema`)).data
    expect(schema.properties.config).toBeUndefined()
    expect((await admin.put(`/api/imports/${imp._id}/configuration`, { config: { nbRows: 20 } }, status)).status).toBe(400)
  })
})
