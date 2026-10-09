import { axiosAuth, cleanDb } from '../../tests/support/axios.ts'
import { publishMockPlugin, mockPluginId } from '../../tests/support/registry.ts'
import { OWNER, OWNER_ADMIN_EMAIL } from './settings.ts'

export type SeedIds = { catalogId: string }

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
  return { catalogId: catalog._id }
}
