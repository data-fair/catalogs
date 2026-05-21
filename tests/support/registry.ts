import fs from 'node:fs'
import path from 'node:path'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { axiosAuth } from '@data-fair/lib-node/axios-auth.js'

const devHost = process.env.DEV_HOST ?? 'localhost'
const nginxPort = process.env.NGINX_PORT ?? '5600'
const registryPort = process.env.REGISTRY_PORT ?? '5601'

export const registryUrl = `http://${devHost}:${nginxPort}/registry`
const directRegistryUrl = `http://localhost:${registryPort}`
const directoryUrl = `http://${devHost}:${nginxPort}/simple-directory`
/** Matches the registry container's SECRET_INTERNAL_SERVICES in docker-compose.yml. */
const secretKey = 'secret-registry-internal'

/** Registry artefact id of the mock catalog plugin (matches catalog.plugin). */
export const mockPluginId = '@data-fair-catalog-mock-0'

// The registry's reqIsInternal() rejects requests that arrive via nginx (which
// adds X-Forwarded-Host). Internal-secret endpoints must be called directly.
const internalAx = axiosBuilder({ baseURL: directRegistryUrl, headers: { 'x-secret-key': secretKey } })

/**
 * Publish the mock catalog plugin tarball to the dev registry, public, with a
 * title — idempotent (a repeat upload replaces the arch tarball slot).
 * Upload and metadata PATCH both accept the registry internal secret.
 * Mock project: https://github.com/data-fair/catalog-mock
 */
export const publishMockPlugin = async () => {
  const tarballPath = path.join(import.meta.dirname, '..', 'fixtures', 'catalog-mock.tgz')
  const form = new FormData()
  form.append('architecture', process.arch)
  form.append('category', 'catalog')
  form.append('file', new Blob([fs.readFileSync(tarballPath)]), 'catalog-mock.tgz')
  await internalAx.post(`/api/v1/artefacts/npm/${encodeURIComponent(mockPluginId)}`, form, {
    validateStatus: s => s === 201
  })
  await internalAx.patch(`/api/v1/artefacts/${encodeURIComponent(mockPluginId)}`, {
    public: true,
    title: { fr: 'Mock', en: 'Mock' }
  })
}

/**
 * Remove the mock catalog plugin from the dev registry.
 * The registry's DELETE endpoint requires a superadmin session (the internal
 * secret is accepted for upload and PATCH but not for DELETE).
 */
export const deleteMockPlugin = async () => {
  const superadmin = await axiosAuth({
    email: 'test_superadmin@test.com',
    password: 'superpasswd',
    adminMode: true,
    directoryUrl,
    axiosOpts: { baseURL: registryUrl }
  })
  await superadmin.delete(`/api/v1/artefacts/${encodeURIComponent(mockPluginId)}`, {
    validateStatus: s => s === 204 || s === 404
  })
}
