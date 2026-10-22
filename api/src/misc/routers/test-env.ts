import express from 'express'
import fs from 'fs-extra'
import mongo from '#mongo'
import { registryCacheDir } from '#config'

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
// It refuses (409) while the worker still runs a test task after a short wait: deleting its
// data under it would leak the task into the next test, so the leak is reported where it starts.
router.delete('/', async (req, res, next) => {
  try {
    const testOwnerFilter = { 'owner.id': { $regex: /^test_/ } }

    const runningFilter = { ...testOwnerFilter, status: 'running' as const }
    const running = async () => [
      ...(await mongo.imports.find(runningFilter).project({ _id: 1 }).toArray()).map(t => `import/${t._id}`),
      ...(await mongo.publications.find(runningFilter).project({ _id: 1 }).toArray()).map(t => `publication/${t._id}`)
    ]
    let tasks = await running()
    for (let i = 0; tasks.length && i < 50; i++) {
      await new Promise(resolve => setTimeout(resolve, 100))
      tasks = await running()
    }
    if (tasks.length) {
      res.status(409).send(`tasks still running after 5 s: ${tasks.join(', ')}`)
      return
    }

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

// Wipe the local registry artefact cache (used between test runs).
router.delete('/plugins', async (req, res, next) => {
  try {
    await fs.emptyDir(registryCacheDir)
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
