import fs from 'node:fs'
import path from 'node:path'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { axiosAuth } from '@data-fair/lib-node/axios-auth.js'

const devHost = process.env.DEV_HOST ?? 'localhost'
const nginxPort = process.env.NGINX_PORT ?? '5600'
const registryPort = process.env.REGISTRY_PORT ?? '5601'

export const registryUrl = `http://${devHost}:${nginxPort}/registry`
const directoryUrl = `http://${devHost}:${nginxPort}/simple-directory`
/** Matches the registry container's SECRET_INTERNAL_SERVICES in docker-compose.yml. */
const secretKey = 'secret-registry-internal'

/** npm package name of the mock catalog plugin. */
const mockPackageName = '@data-fair/catalog-mock'

/** Registry artefact id of the mock catalog plugin (matches catalog.plugin). */
export const mockPluginId = `${mockPackageName}@0`

// The upload endpoint accepts the internal secret, but only on direct (non-proxied)
// connections — nginx adds x-forwarded-host which makes reqIsInternal() return false.
const uploadAx = axiosBuilder({ baseURL: `http://localhost:${registryPort}`, headers: { 'x-secret-key': secretKey } })

/** Axios instance authenticated as superadmin, scoped to the registry via nginx. */
const adminAx = () => axiosAuth({
  email: 'test_superadmin@test.com',
  password: 'superpasswd',
  adminMode: true,
  directoryUrl,
  axiosOpts: { baseURL: registryUrl }
})

/**
 * Publish the mock catalog plugin tarball to the dev registry, public, with a
 * title — idempotent (a repeat upload replaces the arch tarball slot).
 * Mock project: https://github.com/data-fair/catalog-mock
 */
export const publishMockPlugin = async () => {
  const tarballPath = path.join(import.meta.dirname, '..', 'fixtures', 'catalog-mock.tgz')
  const form = new FormData()
  form.append('architecture', process.arch)
  form.append('file', new Blob([fs.readFileSync(tarballPath)]), 'catalog-mock.tgz')
  // 201 = created, 409 = version already exists (idempotent: proceed to PATCH)
  await uploadAx.post(`/api/v1/artefacts/${encodeURIComponent(mockPackageName)}/versions`, form, {
    validateStatus: s => s === 201 || s === 409
  })
  const ax = await adminAx()
  await ax.patch(`/api/v1/artefacts/${encodeURIComponent(mockPluginId)}`, {
    public: true,
    title: { fr: 'Mock', en: 'Mock' }
  })
}

/** Remove the mock catalog plugin from the dev registry. */
export const deleteMockPlugin = async () => {
  const ax = await adminAx()
  await ax.delete(`/api/v1/artefacts/${encodeURIComponent(mockPluginId)}`, {
    validateStatus: s => s === 204 || s === 404
  })
}
