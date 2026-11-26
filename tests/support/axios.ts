import type { AxiosAuthOptions } from '@data-fair/lib-node/axios-auth.js'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { axiosAuth as _axiosAuth } from '@data-fair/lib-node/axios-auth.js'
import { prefix } from './sd-fixtures.ts'

/**
 * The test accounts are those of the sub-space test_catalogs_ (tests/support/sd-fixtures.ts), seeded in
 * simple-directory by tests/global-setup.ts and tests/state-setup.ts: password 'passwd', email `<id>@test.com`.
 * test_catalogs_superadmin is a simple-directory admin, logged in admin mode.
 */

const devHost = process.env.DEV_HOST ?? 'localhost'
const nginxPort = process.env.NGINX_PORT ?? '5600'

export const directoryUrl = `http://${devHost}:${nginxPort}/simple-directory`
export const baseURL = `http://${devHost}:${nginxPort}/catalogs`

const axiosOpts = { baseURL }

export const axios = (opts = {}) => axiosBuilder({ ...axiosOpts, ...opts })
export const anonymousAx = axios()

export const axiosAuth = (opts: string | Omit<AxiosAuthOptions, 'directoryUrl' | 'axiosOpts' | 'password'>) => {
  opts = typeof opts === 'string' ? { email: opts } : opts
  const adminMode = opts.email === `${prefix}superadmin@test.com`
  return _axiosAuth({ ...opts, password: 'passwd', adminMode, axiosOpts, directoryUrl })
}

/** Delete the catalogs, imports and publications of the test sub-space on the running dev API. */
export const cleanDb = async () => {
  await anonymousAx.delete('/api/test-env', { params: { prefix } })
}

/** Remove the test sub-space's plugins from the registry artefact cache of the running dev API. */
export const cleanPlugins = async () => {
  await anonymousAx.delete('/api/test-env/plugins', { params: { prefix } })
}
