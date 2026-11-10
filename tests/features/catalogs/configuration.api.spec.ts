import { test, expect } from '../../fixtures/login.ts'
import { axios, axiosAuth, cleanDb } from '../../support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../support/registry.ts'

const owner = { type: 'organization', id: 'test_org1', name: 'Test Org 1' }
const status = { validateStatus: () => true }
const rawCatalog = async (id: string) => (await axios().get(`/api/test-env/catalogs/${id}`)).data

test.describe('catalog configuration', () => {
  test.beforeAll(publishMockPlugin)
  test.beforeEach(cleanDb)
  test.afterAll(cleanDb)

  const create = async () => {
    const admin = await axiosAuth({ email: 'test_admin1@test.com', org: 'test_org1' })
    const catalog = (await admin.post('/api/catalogs', { title: 'Configured', plugin: mockPluginId, owner, config: { url: 'https://example.com', delay: 0 } })).data
    return { admin, catalog }
  }

  test('reads the title and the config, never the secrets', async () => {
    const { admin, catalog } = await create()
    const conf = (await admin.get(`/api/catalogs/${catalog._id}/configuration`)).data
    expect(conf).toEqual({ title: 'Configured', config: catalog.config })
    expect(conf.secrets).toBeUndefined()
  })

  test('a whole-document save stores a new secret and masks it', async () => {
    const { admin, catalog } = await create()
    const res = await admin.put(`/api/catalogs/${catalog._id}/configuration`, { title: 'Renamed', config: { url: 'https://example.com', delay: 0, secretField: 'S3cret' } })
    expect(res.status).toBe(200)
    expect(res.data.title).toBe('Renamed')
    const conf = (await admin.get(`/api/catalogs/${catalog._id}/configuration`)).data
    expect(conf.config.secretField).toBeTruthy()
    expect(conf.config.secretField).not.toBe('S3cret')
    expect((await rawCatalog(catalog._id)).secrets.secretField).toBeTruthy()
  })

  test('saving the read document back keeps the stored secret as it is', async () => {
    const { admin, catalog } = await create()
    await admin.put(`/api/catalogs/${catalog._id}/configuration`, { title: 'Configured', config: { url: 'https://example.com', delay: 0, secretField: 'S3cret' } })
    const before = (await rawCatalog(catalog._id)).secrets
    const conf = (await admin.get(`/api/catalogs/${catalog._id}/configuration`)).data
    expect((await admin.put(`/api/catalogs/${catalog._id}/configuration`, conf, status)).status).toBe(200)
    expect((await rawCatalog(catalog._id)).secrets).toEqual(before)
  })

  test('a key outside the configuration is refused', async () => {
    const { admin, catalog } = await create()
    const res = await admin.put(`/api/catalogs/${catalog._id}/configuration`, { title: 'x', config: catalog.config, plugin: 'other' }, status)
    expect(res.status).toBe(400)
  })

  test('a non-admin of the owner gets the same answer as on PATCH', async () => {
    const { catalog } = await create()
    const contrib = await axiosAuth({ email: 'test_contrib1@test.com', org: 'test_org1' })
    const put = await contrib.put(`/api/catalogs/${catalog._id}/configuration`, { title: 'x', config: catalog.config }, status)
    const patch = await contrib.patch(`/api/catalogs/${catalog._id}`, { title: 'x' }, status)
    expect(put.status).toBe(patch.status)
    expect(put.status).toBe(403)
  })

  test('the schema has the plugin config', async () => {
    const { admin, catalog } = await create()
    const schema = (await admin.get(`/api/catalogs/${catalog._id}/configuration-schema`)).data
    expect(schema.properties.config.properties.url).toBeTruthy()
    expect(Object.keys(schema.properties).sort()).toEqual(['config', 'description', 'title'])
    expect(schema.additionalProperties).toBe(false)
  })
})
