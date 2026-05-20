import express from 'express'
import fs from 'fs-extra'
import path from 'node:path'
import mongo from '#mongo'
import config from '#config'

// This router is only mounted when NODE_ENV=development (see app.ts).
// It lets the Playwright test suite reset state on the running dev API.
const router = express.Router()

// Readiness probe used by the test suite's state-setup project.
router.get('/', (req, res) => {
  res.json({ ok: true })
})

// Cleanup test_* owned data from mongo. Only documents whose owner.id starts
// with "test_" are removed, so interactive dev work under other accounts
// survives test runs.
router.delete('/', async (req, res, next) => {
  try {
    const testOwnerFilter = { 'owner.id': { $regex: /^test_/ } }

    await Promise.all([
      mongo.catalogs.deleteMany(testOwnerFilter),
      mongo.imports.deleteMany(testOwnerFilter),
      mongo.publications.deleteMany(testOwnerFilter),
      mongo.db.collection('locks').deleteMany({})
    ])

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// Wipe the installed plugins directory (used between test runs).
router.delete('/plugins', async (req, res, next) => {
  try {
    const pluginsDir = path.resolve(config.dataDir, 'plugins')
    await fs.emptyDir(pluginsDir)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
