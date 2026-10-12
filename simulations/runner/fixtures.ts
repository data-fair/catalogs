import { axiosAuth, cleanDb } from '../../tests/support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../tests/support/registry.ts'
import { OWNER, OWNER_ADMIN_EMAIL } from './settings.ts'

export type SeedIds = { catalogId: string, failedImportId: string }

export async function seedAll (): Promise<SeedIds> {
  await cleanDb()
  await publishMockPlugin()
  const admin = await axiosAuth({ email: OWNER_ADMIN_EMAIL, org: OWNER.id })
  const { data: catalog } = await admin.post('/api/catalogs', {
    title: 'Catalogue open data de la région',
    plugin: mockPluginId,
    owner: OWNER,
    config: { url: 'https://data.gouv.fr', delay: 0 }
  })
  // a remote resource deleted since it was imported: the mock plugin fails with « Resource … not found »
  const { data: failedImport } = await admin.post('/api/imports', {
    catalog: { id: catalog._id, title: catalog.title },
    remoteResource: { id: 'statistiques-transport-2019', title: 'Statistiques transport 2019' },
    config: { nbRows: 10 },
    scheduling: [],
    shouldUpdateMetadata: true,
    shouldUpdateSchema: true
  })
  for (let i = 0; i < 60; i++) {
    const { data } = await admin.get(`/api/imports/${failedImport._id}`)
    if (data.status === 'error') return { catalogId: catalog._id, failedImportId: failedImport._id }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  throw new Error('the seeded import did not fail within 60s, is the worker running?')
}
