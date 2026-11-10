import neostandard from 'neostandard'
import dfLibRecommended from '@data-fair/lib-utils/eslint/recommended.js'

export default [
  { ignores: ['ui/', '**/.type/', 'data/'] },
  ...dfLibRecommended,
  ...neostandard({ ts: true }),
  {
    // server code logs through @data-fair/lib-node/log.js (its README, "Logging"), api/scripts/ keep console
    files: ['api/src/**/*.ts', 'api/index.ts', 'worker/src/**/*.ts', 'worker/index.ts', 'shared/**/*.ts'],
    rules: { 'no-console': 'error' }
  }
]
