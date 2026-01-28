import { resolve } from 'node:path'
import express from 'express'
import { session, errorHandler, createSiteMiddleware, createSpaMiddleware, defaultNonceCSPDirectives } from '@data-fair/lib-express'
import { getStatus } from './admin/status.ts'
import config, { uiConfig } from '#config'

import catalogsRouter from './catalogs/router.ts'
import datasetsRouter from './misc/routers/datasets.ts'
import identitiesRouter from './misc/routers/identities.ts'
import importsRouter from './imports/router.ts'
import pluginsRegistryRouter from './plugins/registry/router.ts'
import pluginRouter from './plugins/router.ts'
import publicationsRouter from './publications/router.ts'
import adminRouter from './admin/router.ts'

export const app = express()

// no fancy embedded arrays, just string and arrays of strings in req.query
app.set('query parser', 'simple')
app.use(createSiteMiddleware('catalogs'))
app.use(session.middleware())

app.set('json spaces', 2)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/catalogs', catalogsRouter)
app.use('/api/datasets', datasetsRouter)
app.use('/api/identities', identitiesRouter)
app.use('/api/imports', importsRouter)
app.use('/api/plugins-registry', pluginsRegistryRouter)
app.use('/api/plugins', pluginRouter)
app.use('/api/publications', publicationsRouter)
app.use('/api/admin', adminRouter)

app.get('/api/ping', async (req, res) => {
  const status = await getStatus(req)
  if (status.status === 'error') res.status(500)
  res.send(status.status)
})

app.use('/api', (req, res) => { res.status(404).send('unknown api endpoint') })

if (process.env.NODE_ENV !== 'test') {
  const cspDirectives = { ...defaultNonceCSPDirectives }
  // necessary to use vjsf without pre-compilation
  cspDirectives['script-src'] = "'unsafe-eval' " + defaultNonceCSPDirectives['script-src']
  cspDirectives['connect-src'] = "'self' https:"
  app.use(await createSpaMiddleware(resolve(import.meta.dirname, '../../ui/dist'), uiConfig, {
    csp: {
      nonce: true,
      header: cspDirectives
    },
    privateDirectoryUrl: config.privateDirectoryUrl
  }))
}

app.use(errorHandler)
