import type { AxiosAuthOptions } from '@data-fair/lib-node/axios-auth.js'
import fs from 'node:fs'
import path from 'node:path'
import FormData from 'form-data'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { axiosAuth as _axiosAuth } from '@data-fair/lib-node/axios-auth.js'

/**
 * Test users and orgs are defined in:
 *   - dev/resources/users.json — accounts test_superadmin, test_admin1, test_contrib1,
 *     test_user1, test_dep_admin, test_dep_contrib, test_admin2 (all use password
 *     'passwd' except test_superadmin which uses 'superpasswd').
 *   - dev/resources/organizations.json — test_org1 (departments dep1/dep2) and test_org2.
 *
 * Loaded by simple-directory (STORAGE_TYPE=file in docker-compose.yml).
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
  const isSuperadmin = opts.email === 'test_superadmin@test.com' || opts.email === 'superadmin@test.com'
  const password = isSuperadmin ? 'superpasswd' : 'passwd'
  const adminMode = isSuperadmin
  return _axiosAuth({ ...opts, password, adminMode, axiosOpts, directoryUrl })
}

/** Delete all test_* owned catalogs/imports/publications on the running dev API. */
export const cleanDb = async () => {
  await anonymousAx.delete('/api/test-env')
}

/** Wipe the installed plugins directory on the running dev API. */
export const cleanPlugins = async () => {
  await anonymousAx.delete('/api/test-env/plugins')
}

/**
 * Install the mock catalog plugin used by the API tests.
 * Mock project: https://github.com/data-fair/catalog-mock
 */
export const installMockPlugin = async () => {
  const superadmin = await axiosAuth('test_superadmin@test.com')
  const tarballPath = path.join(import.meta.dirname, '..', 'fixtures', 'catalog-mock.tgz')
  const formData = new FormData()
  formData.append('file', fs.createReadStream(tarballPath))
  await superadmin.post('/api/plugins', formData, { headers: formData.getHeaders() })
}
