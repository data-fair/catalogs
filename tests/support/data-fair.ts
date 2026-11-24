import { axiosAuth } from '@data-fair/lib-node/axios-auth.js'
import { anonymousAx, directoryUrl } from './axios.ts'
import { prefix } from './sd-fixtures.ts'

/**
 * The worker writes the imported datasets in data-fair, in the name of their owner (x-account), with an API key
 * in admin mode (adminMode and asAccount, which only a super admin can create). The test setup creates it
 * through data-fair's public API, as the sub-space's super admin and on its own settings (user
 * test_catalogs_superadmin, removed by data-fair's clean of the sub-space), then hands it to the worker through
 * catalogs' test API: in development the worker reads it before each task (worker/src/lib/data-fair-api-key.ts).
 * Nothing is written in data-fair's database directly.
 */

export const dataFairUrl = `http://${process.env.DEV_HOST}:${process.env.NGINX_PORT}/data-fair`
export const workerKeyTitle = 'Catalogs worker (tests)'
const owner = `user/${prefix}superadmin`

/** data-fair's API as the sub-space's super admin, in admin mode */
export const dataFairSuperadmin = () => axiosAuth({
  email: `${prefix}superadmin@test.com`,
  password: 'passwd',
  adminMode: true,
  directoryUrl,
  axiosOpts: { baseURL: `${dataFairUrl}/api/v1` }
})

/**
 * Create a new worker key (the previous ones of these settings are replaced) and hand it to the worker.
 * Returns the clear key.
 */
export const setupWorkerApiKey = async (): Promise<string> => {
  const superadmin = await dataFairSuperadmin()
  const res = await superadmin.patch(`/settings/${owner}`, {
    apiKeys: [{ title: workerKeyTitle, scopes: ['datasets'], adminMode: true, asAccount: true }]
  })
  const clearKey: string | undefined = res.data.apiKeys?.find((k: any) => k.title === workerKeyTitle)?.clearKey
  if (!clearKey) throw new Error(`data-fair did not return the clear key of the worker: ${JSON.stringify(res.data.apiKeys)}`)
  await anonymousAx.put('/api/test-env/data-fair-api-key', { key: clearKey })
  return clearKey
}
