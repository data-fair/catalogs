import { resolve } from 'node:path'
import express from 'express'
import { session, errorHandler, createSiteMiddleware, createSpaMiddleware } from '@data-fair/lib-express/index.js'
import pluginsRegistryRouter from './routers/plugins-registry.ts'
import pluginRouter from './routers/plugins.ts'
import adminRouter from './admin.ts'
import config, { uiConfig } from '#config'

export const app = express()

// no fancy embedded arrays, just string and arrays of strings in req.query
app.set('query parser', 'simple')

app.use(createSiteMiddleware('catalogs'))

app.use(session.middleware())

app.set('json spaces', 2)
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api/plugins-registry', pluginsRegistryRouter)
app.use('/api/plugins', pluginRouter)
app.use('/api/admin', adminRouter)

if (config.serveUi) {
  app.use(await createSpaMiddleware(resolve(import.meta.dirname, '../../ui/dist'), uiConfig))
}

app.use(errorHandler)
