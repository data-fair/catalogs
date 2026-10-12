import { test, expect } from '@playwright/test'
import { cases } from '../../../simulations/cases/index.ts'
import { resolveRoute } from '../../../simulations/runner/backoffice.ts'

test('simulation cases have unique file-safe names and back-office routes', () => {
  const names = cases.map(c => c.name)
  expect(new Set(names).size).toBe(names.length)
  for (const c of cases) {
    expect(c.name).toMatch(/^[a-z0-9-]+$/)
    expect(resolveRoute(c.route, { catalogId: 'abc', failedImportId: 'def' })).toMatch(/^\/data-fair\/catalogs\/[a-z0-9/]+$/)
    expect(c).not.toHaveProperty('expected')
  }
})
