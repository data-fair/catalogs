import { test, expect } from '@playwright/test'
import { acceptedScopes, scopeDescriptions, scopedOperations, requireOperationScope } from '../../../api/src/scopes.ts'

test.describe('scope vocabulary', () => {
  test('a tier accepts the higher tiers of its family, the umbrella and the global tiers', () => {
    expect(acceptedScopes('catalogs', 'read')).toEqual(['catalogs:read', 'catalogs:write', 'catalogs:admin', 'catalogs', 'all:read', 'all:write', 'all:admin'])
    expect(acceptedScopes('catalogs', 'admin')).toEqual(['catalogs:admin', 'catalogs', 'all:admin'])
  })

  test('every accepted scope is described in both locales', () => {
    const fr = scopeDescriptions('fr')
    const en = scopeDescriptions('en')
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort())
    expect(Object.keys(fr)).toHaveLength(7)
    for (const scope of acceptedScopes('catalogs', 'read')) expect(Object.keys(fr)).toContain(scope)
  })

  test('the write and admin descriptions say what reaches outside of catalogs', () => {
    const en = scopeDescriptions('en')
    expect(en['catalogs:write']).toMatch(/datasets/)
    expect(en['catalogs:write']).toMatch(/outside catalogs/)
    expect(en['catalogs:admin']).toMatch(/credentials/)
  })

  test('the operation table', () => {
    const read = { family: 'catalogs', tier: 'read' }
    const write = { family: 'catalogs', tier: 'write' }
    const admin = { family: 'catalogs', tier: 'admin' }
    expect(scopedOperations).toEqual({
      listCatalogs: { method: 'get', path: '/catalogs', ...read },
      getCatalog: { method: 'get', path: '/catalogs/{id}', ...read },
      listCatalogResources: { method: 'get', path: '/catalogs/{id}/resources', ...read },
      getCatalogConfiguration: { method: 'get', path: '/catalogs/{id}/configuration', ...read },
      getCatalogConfigurationSchema: { method: 'get', path: '/catalogs/{id}/configuration-schema', ...read },
      getPlugin: { method: 'get', path: '/plugins/{id}', ...read },
      listImports: { method: 'get', path: '/imports', ...read },
      getImport: { method: 'get', path: '/imports/{id}', ...read },
      getImportConfiguration: { method: 'get', path: '/imports/{id}/configuration', ...read },
      getImportConfigurationSchema: { method: 'get', path: '/imports/{id}/configuration-schema', ...read },
      listPublications: { method: 'get', path: '/publications', ...read },
      getPublication: { method: 'get', path: '/publications/{id}', ...read },
      postImport: { method: 'post', path: '/imports', ...write },
      patchImport: { method: 'patch', path: '/imports/{id}', ...write },
      putImportConfiguration: { method: 'put', path: '/imports/{id}/configuration', ...write },
      postPublication: { method: 'post', path: '/publications', ...write },
      rerunPublication: { method: 'post', path: '/publications/{id}', ...write },
      postCatalog: { method: 'post', path: '/catalogs', ...admin },
      patchCatalog: { method: 'patch', path: '/catalogs/{id}', ...admin },
      putCatalogConfiguration: { method: 'put', path: '/catalogs/{id}/configuration', ...admin },
      deleteCatalog: { method: 'delete', path: '/catalogs/{id}', ...admin },
      deleteImport: { method: 'delete', path: '/imports/{id}', ...admin },
      deletePublication: { method: 'delete', path: '/publications/{id}', ...admin }
    })
  })

  test('an unknown operation fails at declaration', () => {
    expect(() => requireOperationScope('nope' as any)).toThrow()
  })
})
