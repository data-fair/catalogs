import assert from 'node:assert/strict'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { test as setup } from '@playwright/test'
import { baseURL } from './support/axios.ts'
import { seedDataFairApiKey } from './support/data-fair.ts'

const ax = axiosBuilder()

setup('Stateful tests setup', async () => {
  // Check that the dev API server is up — the dev environment IS the test environment.
  await assert.doesNotReject(
    ax.get(`${baseURL}/api/test-env`),
    `Dev API server seems to be unavailable at ${baseURL}.
If you are an agent, do not try to start it: read its logs (dev/logs/api.log, or DEV_LOG_DIR) and report the problem to your user.`
  )
  await seedDataFairApiKey()
})
