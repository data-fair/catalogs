import { resolve } from 'node:path'
import express from 'express'
import { session, errorHandler, createSiteMiddleware, createSpaMiddleware, defaultNonceCSPDirectives } from '@data-fair/lib-express'
import { getStatus } from './admin/status.ts'
import config, { uiConfig } from '#config'

import catalogsRouter from './catalogs/router.ts'
import datasetsRouter from './misc/routers/datasets.ts'
import identitiesRouter from './misc/routers/identities.ts'
import importsRouter from './imports/router.ts'
import pluginRouter from './plugins/router.ts'
import publicationsRouter from './publications/router.ts'
import adminRouter from './admin/router.ts'
import apiDocs from '../contract/api-docs.ts'
import { readAgentSkill } from '../contract/skills.ts'

export const app = express()

// no fancy embedded arrays, just string and arrays of strings in req.query
app.set('query parser', 'simple')
app.use(createSiteMiddleware('catalogs'))
app.use(session.middleware())

app.set('json spaces', 2)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// public, read by data-fair (private url, no forwarded headers) to merge it into its platform document
app.get('/api/api-docs.json', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300')
  res.vary('Accept-Language')
  res.json(apiDocs(req.acceptsLanguages('fr', 'en') === 'en' ? 'en' : 'fr'))
})

// the bodies of the document's skills, linked from its x-agent.skills; public like the document
app.get('/api/agents/skills/:file', (req, res) => {
  const body = req.params.file.endsWith('.md') ? readAgentSkill(req.params.file.slice(0, -3)) : undefined
  if (!body) return res.status(404).send('unknown skill')
  res.set('Cache-Control', 'public, max-age=300')
  res.type('text/markdown').send(body)
})

app.use('/api/catalogs', catalogsRouter)
app.use('/api/datasets', datasetsRouter)
app.use('/api/identities', identitiesRouter)
app.use('/api/imports', importsRouter)
app.use('/api/plugins', pluginRouter)
app.use('/api/publications', publicationsRouter)
app.use('/api/admin', adminRouter)

if (process.env.NODE_ENV === 'development') {
  // test-env endpoints used by the Playwright suite to reset state
  app.use('/api/test-env', (await import('./misc/routers/test-env.ts')).default)
}

app.get('/api/ping', async (req, res) => {
  const status = await getStatus(req)
  if (status.status === 'error') res.status(500)
  res.send(status.status)
})

app.use('/api', (req, res) => { res.status(404).send('unknown api endpoint') })

if (process.env.NODE_ENV !== 'development') {
  // in development the UI is served by the Vite dev server through nginx
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
