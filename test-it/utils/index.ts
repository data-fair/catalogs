import type { AxiosAuthOptions } from '@data-fair/lib-node/axios-auth.js'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { axiosAuth as _axiosAuth } from '@data-fair/lib-node/axios-auth.js'
import fs from 'fs-extra'
import FormData from 'form-data'
import path from 'path'

const directoryUrl = 'http://localhost:5600/simple-directory'

const axiosOpts = { baseURL: 'http://localhost:5600/catalogs' }

export const axios = (opts = {}) => axiosBuilder({ ...axiosOpts, ...opts })

export const axiosAuth = (opts: string | Omit<AxiosAuthOptions, 'directoryUrl' | 'axiosOpts' | 'password'>) => {
  opts = typeof opts === 'string' ? { email: opts } : opts
  const password = opts.email === 'superadmin@test.com' ? 'superpasswd' : 'passwd'
  const adminMode = opts.email === 'superadmin@test.com'
  return _axiosAuth({ ...opts, password, adminMode, axiosOpts, directoryUrl })
}

/**
 * Installs the mock plugin for testing purposes.
 * Mock project : https://github.com/data-fair/catalog-mock
 */
export const installMockPlugin = async () => {
  console.log('Installing mock plugin...')
  const superadmin = await axiosAuth('superadmin@test.com')

  const tarballPath = path.join(import.meta.dirname, 'catalog-mock.tgz')
  const formData = new FormData()
  formData.append('file', fs.createReadStream(tarballPath))

  await superadmin.post('/api/plugins', formData, {
    headers: formData.getHeaders()
  })
  console.log('Mock plugin installed successfully.')
}

/**
 * Cleans only the database
 */
export const clean = async () => {
  const mongo = (await import('../../api/src/mongo.ts')).default
  for (const name of ['catalogs', 'imports', 'publications']) {
    await mongo.db.collection(name).deleteMany({})
  }
}

/**
 * Cleans the database and the data directory
 */
export const cleanAll = async () => {
  await clean()
  await fs.emptyDir('./data/test/')
}

process.env.SUPPRESS_NO_CONFIG_WARNING = '1'

export const startApiServer = async () => {
  console.log('Starting API server...')
  process.env.NODE_CONFIG_DIR = 'api/config/'
  const apiServer = await import('../../api/src/server.ts')
  await apiServer.start()
}

export const stopApiServer = async () => {
  const apiServer = await import('../../api/src/server.ts')
  await apiServer.stop()
}
