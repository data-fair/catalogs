import path from 'node:path'
import os from 'node:os'
import type { ApiConfig } from '../config/type/index.ts'
import { assertValid } from '../config/type/index.ts'
import config from 'config'

assertValid(config, { lang: 'en', name: 'config', internal: true })

const rawConfig = config as unknown as ApiConfig

// tmpDir defaults to <dataDir>/tmp when dataDir is set, else an OS temp dir.
if (!rawConfig.tmpDir) {
  rawConfig.tmpDir = rawConfig.dataDir
    ? path.join(rawConfig.dataDir, 'tmp')
    : path.join(os.tmpdir(), 'data-fair-catalogs')
}

const apiConfig = rawConfig as ApiConfig & { tmpDir: string }
export default apiConfig

// The registry artefact cache always lives under tmpDir.
export const registryCacheDir = path.join(apiConfig.tmpDir, 'registry-cache')

export const uiConfig = {}
export type UiConfig = typeof uiConfig
