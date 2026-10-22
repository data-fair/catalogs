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
If you are an agent, read its logs with "npx --no df-dev logs api" and report the problem to your user (or "npx --no df-dev restart api" if the pane exited).`
  )
  await seedDataFairApiKey()
})
