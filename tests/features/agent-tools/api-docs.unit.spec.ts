import { test, expect } from '@playwright/test'
import apiDocs from '../../../api/contract/api-docs.ts'
import { acceptedScopes, scopedOperations, type ScopedOperation } from '../../../api/src/scopes.ts'

const operationsOf = (doc: any) => Object.values(doc.paths as Record<string, Record<string, any>>).flatMap(methods => Object.values(methods))

test.describe('api document', () => {
  test('one operation per row of the scopes table', () => {
    const ids = operationsOf(apiDocs()).map(op => op.operationId)
    expect(ids.sort()).toEqual(Object.keys(scopedOperations).sort())
  })

  test('each operation at its path and method, accepting its scopes', () => {
    const doc = apiDocs()
    for (const [operationId, row] of Object.entries(scopedOperations) as [string, ScopedOperation][]) {
      const operation = doc.paths[row.path]?.[row.method]
      expect(operation?.operationId, operationId).toBe(operationId)
      expect(operation.security, operationId).toEqual([{ sdCookie: [] }, ...acceptedScopes(row.family, row.tier).map(s => ({ oauth2: [s] }))])
      expect(operation.tags, operationId).toHaveLength(1)
      expect(operation.summary, operationId).toBeTruthy()
      expect(operation.responses, operationId).toBeTruthy()
    }
  })

  test('origin independent', () => {
    expect(apiDocs().servers).toEqual([{ url: '/catalogs/api' }])
    const text = JSON.stringify(apiDocs())
    expect(text).not.toContain('localhost')
    if (process.env.DEV_HOST) expect(text).not.toContain(process.env.DEV_HOST)
  })

  test('no secrets in the schemas', () => {
    expect(JSON.stringify(apiDocs())).not.toContain('"secrets"')
    expect(JSON.stringify(apiDocs('en'))).not.toContain('"secrets"')
  })

  test('the components are referenced and resolvable', () => {
    const doc = apiDocs()
    const refs = [...JSON.stringify(doc).matchAll(/"#\/components\/schemas\/([^"]+)"/g)].map(m => m[1])
    for (const name of refs) expect(doc.components.schemas[name], name).toBeTruthy()
    expect(JSON.stringify(doc)).not.toContain('"$id"')
    expect(JSON.stringify(doc)).not.toContain('x-exports')
  })
})
