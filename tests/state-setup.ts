import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { axiosBuilder } from '@data-fair/lib-node/axios.js'
import { test as setup } from '@playwright/test'
import { baseURL } from './support/axios.ts'

const ax = axiosBuilder()

setup('Stateful tests setup', async () => {
  // Check that the dev API server is up — the dev environment IS the test environment.
  await assert.doesNotReject(
    ax.get(`${baseURL}/api/test-env`),
    `Dev API server seems to be unavailable at ${baseURL}.
If you are an agent do not try to start it. Instead check for a startup failure at the end of dev/logs/dev-api.log and report this problem to your user.`
  )

  // More visible dev server logs straight in the test output
  try {
    if (!existsSync('dev/logs')) mkdirSync('dev/logs', { recursive: true })
    const tailApi = spawn('tail', ['-n', '0', '-f', 'dev/logs/dev-api.log'], { stdio: 'inherit', detached: true })
    const tailWorker = spawn('tail', ['-n', '0', '-f', 'dev/logs/dev-worker.log'], { stdio: 'inherit', detached: true })
    process.env.TAIL_PIDS = [tailApi.pid, tailWorker.pid].filter(Boolean).join(',')
  } catch {
    // log tailing is optional
  }
})
