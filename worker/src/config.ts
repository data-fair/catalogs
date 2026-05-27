import path from 'node:path'
import os from 'node:os'
import type { WorkerConfig } from '../config/type/index.ts'
import { assertValid } from '../config/type/index.ts'
import config from 'config'

assertValid(config, { lang: 'en', name: 'config', internal: true })

const rawConfig = config as unknown as WorkerConfig

// tmpDir defaults to <dataDir>/tmp when dataDir is set, else an OS temp dir.
if (!rawConfig.tmpDir) {
  rawConfig.tmpDir = rawConfig.dataDir
    ? path.join(rawConfig.dataDir, 'tmp')
    : path.join(os.tmpdir(), 'data-fair-catalogs')
}

const workerConfig = rawConfig as WorkerConfig & { tmpDir: string }
export default workerConfig

// The registry artefact cache always lives under tmpDir.
export const registryCacheDir = path.join(workerConfig.tmpDir, 'registry-cache')
