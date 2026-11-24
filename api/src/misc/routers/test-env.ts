import express from 'express'
import fs from 'fs-extra'
import mongo from '#mongo'
import { registryCacheDir } from '#config'

// This router is only mounted when NODE_ENV=development (see app.ts).
// It lets the Playwright test suite reset state on the running dev API.
const router = express.Router()

// Prefixed test sub-spaces: a test suite owns the accounts whose ids start with its own prefix (test_<suite>_)
// and the data they own, cleaned without touching the other suites nor the unprefixed accounts
const testPrefixRegexp = /^test_[a-z0-9]+(?:_[a-z0-9]+)*_$/

// Readiness probe used by the test suite's state-setup project.
router.get('/', (req, res) => {
  res.json({ ok: true })
})

// Cleanup of a sub-space (DELETE /?prefix=test_<suite>_): the catalogs, imports and publications owned by its
// accounts, and the locks of those tasks. Nothing else: the other sub-spaces and the unprefixed accounts keep
// their data, the worker keeps its other locks.
// It refuses (409) while the worker still runs a task of the sub-space after a short wait: deleting its
// data under it would leak the task into the next test, so the leak is reported where it starts.
router.delete('/', async (req, res, next) => {
  try {
    const prefix = req.query.prefix
    if (typeof prefix !== 'string' || !testPrefixRegexp.test(prefix)) {
      return res.status(400).type('text/plain').send('invalid test prefix')
    }
    // the prefix only holds [a-z0-9_], safe in a regexp
    const testOwnerFilter = { 'owner.id': { $regex: new RegExp('^' + prefix) } }

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

    // the worker locks its tasks as `<type>:<id>`
    const taskLocks = [
      ...(await mongo.imports.find(testOwnerFilter).project({ _id: 1 }).toArray()).map(t => `import:${t._id}`),
      ...(await mongo.publications.find(testOwnerFilter).project({ _id: 1 }).toArray()).map(t => `publication:${t._id}`)
    ]

    await Promise.all([
      mongo.catalogs.deleteMany(testOwnerFilter),
      mongo.imports.deleteMany(testOwnerFilter),
      mongo.publications.deleteMany(testOwnerFilter),
      mongo.db.collection<{ _id: string }>('locks').deleteMany({ _id: { $in: taskLocks } })
    ])

    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

// The raw mongo document of a catalog, ciphered secrets included (tests of the secret handling).
router.get('/catalogs/:id', async (req, res, next) => {
  try {
    const catalog = await mongo.catalogs.findOne({ _id: req.params.id })
    if (!catalog) return res.status(404).send()
    res.json(catalog)
  } catch (err) {
    next(err)
  }
})

// Documents written as is in one of the collections of the sub-space clean, and read back: the test of the clean
// owns two nested sub-spaces whose accounts do not exist in simple-directory.
const docsCollections = ['catalogs', 'imports', 'publications', 'locks']
router.post('/docs/:collection', async (req, res, next) => {
  try {
    if (!docsCollections.includes(req.params.collection)) return res.status(400).send('unknown collection')
    await mongo.db.collection(req.params.collection).insertOne(req.body)
    res.status(201).send()
  } catch (err) {
    next(err)
  }
})
router.get('/docs/:collection/:id', async (req, res, next) => {
  try {
    if (!docsCollections.includes(req.params.collection)) return res.status(400).send('unknown collection')
    const doc = await mongo.db.collection<{ _id: string }>(req.params.collection).findOne({ _id: req.params.id })
    if (!doc) return res.status(404).send()
    res.json(doc)
  } catch (err) {
    next(err)
  }
})

// The data-fair API key of the worker in development: the test setup creates it through data-fair's API and hands
// it over here, the worker reads it from this database before each task (worker/src/lib/data-fair-api-key.ts).
router.put('/data-fair-api-key', async (req, res, next) => {
  try {
    const key = req.body?.key
    if (typeof key !== 'string' || !key) return res.status(400).send('key is required')
    await mongo.db.collection<{ _id: string, key: string }>('test-env')
      .updateOne({ _id: 'data-fair-api-key' }, { $set: { key } }, { upsert: true })
    res.status(204).send()
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
