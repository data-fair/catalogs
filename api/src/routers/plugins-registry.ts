import type { AxiosRequestConfig } from 'axios'
import { Router } from 'express'
import memoize from 'memoizee'
import axios from '@data-fair/lib-node/axios.js'
import { httpError, session } from '@data-fair/lib-express'
import config from '#config'

const router = Router()
export default router

const axiosOpts: AxiosRequestConfig = {}
if (config.npm?.httpsProxy) {
  const proxyUrl = new URL(config.npm?.httpsProxy)
  // cf https://axios-http.com/docs/req_config
  axiosOpts.proxy = {
    protocol: proxyUrl.protocol,
    host: proxyUrl.hostname,
    port: proxyUrl.port ? Number(proxyUrl.port) : (proxyUrl.protocol === 'https:' ? 443 : 80)
  }
  if (proxyUrl.username) axiosOpts.proxy.auth = { username: proxyUrl.username, password: proxyUrl.password }
}

const memoizedSearch = memoize(async (q: string | undefined) => {
  // see https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md#get-v1search
  let res
  try {
    res = await axios.get('https://registry.npmjs.org/-/v1/search', {
      ...axiosOpts,
      params: {
        size: 20,
        text: `keywords:data-fair-catalogs-plugin ${q || ''}`
      }
    })
  } catch (error: any) {
    if (error.status === 429) throw httpError(429, 'Too many requests to NPM registry')
    throw error
  }
  const results = []
  for (const o of res.data.objects) {
    if (!o.package.keywords || !o.package.keywords.includes('data-fair-catalogs-plugin')) continue
    const plugin = {
      id: o.package.name.replace('/', '-'),
      name: o.package.name,
      description: o.package.description,
      version: o.package.version
    }
    results.push(plugin)
  }
  return {
    count: results.length,
    results
  }
}, {
  maxAge: 5 * 60 * 1000 // cached for 5 minutes to be polite with npmjs
})

router.get('/', async (req, res) => {
  await session.reqAdminMode(req)
  if (req.query.q && typeof req.query.q !== 'string') throw httpError(400, 'Invalid query')
  res.send(await memoizedSearch(req.query.q))
})
